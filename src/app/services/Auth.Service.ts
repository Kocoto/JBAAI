// Authentication related models
import UserModel, { IUser } from "../models/User.Model";
import TokenModel from "../models/Token.Model";
import OtpModel from "../models/OTP.Model";
import SubscriptionModel from "../models/Subscription.Model";

// Error handling and utilities
import CustomError from "../utils/Error.Util";
import { sendMail } from "../utils/Mail.Util";

// Authentication utilities
import { compareOtp, generateOTP, hashOtp } from "../utils/OTP.Util";
import { hashPassword, comparePasswords } from "../utils/Password.Util";
import {
  accessTokenGenerator,
  refreshTokenGenerator,
  TokenPayload,
  verifyToken,
  verifyTokenToLogout,
} from "../utils/Token.Util";

// Date handling
import { parseISO } from "date-fns";

// Related services
import InvitationService from "./Invitation.Service";
import InvitationCodeService from "./InvitationCode.Service";
import ProfileService from "./Profile.Service";
import SubscriptionService from "./Subscription.Service";
import mongoose from "mongoose";
import { FranchiseDetailsModel } from "../models/FranchiseDetails.Model";

class AuthService {
  async register(
    email: string,
    password: string,
    username: string,
    phone: string,
    role?: string,
    address?: string,
    invitationCode?: string,
    optionEmail?: string
  ) {
    // Tối ưu: Hash password trước khi vào transaction
    const hashedPassword = await hashPassword(password);

    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async (ses) => {
        // Logic kiểm tra User đã tồn tại (ném lỗi nếu có)
        const existingUser = await UserModel.findOne({
          $or: [{ email }, { username }, { phone }],
        }).session(ses);

        if (existingUser) {
          if (existingUser.email === email)
            throw new CustomError(409, "Email này đã được sử dụng.");
          if (existingUser.username === username)
            throw new CustomError(409, "Username này đã được sử dụng.");
          if (existingUser.phone === phone)
            throw new CustomError(409, "Số điện thoại này đã được sử dụng.");
        }

        // Tạo đối tượng userData
        const userData: any = {
          username,
          email,
          phone,
          role: role || "user",
          password: hashedPassword,
        };
        if (optionEmail) userData.optionEmail = optionEmail;

        // Tạo User
        const createdUsers = await UserModel.create([userData], {
          session: ses,
        });
        const newUser = createdUsers[0];

        // Xử lý mã mời và subscription (đảm bảo chỉ một khối được chạy)
        let needsSave = false; // Dùng cờ để biết khi nào cần save

        if (invitationCode) {
          // Giả sử InvitationCodeService.checkCode sẽ throw lỗi nếu mã không hợp lệ
          // và trả về thông tin mã nếu hợp lệ.
          const invitationCodeInfo = await InvitationCodeService.checkCode(
            invitationCode,
            ses
          );
          if (!invitationCodeInfo) {
            throw new CustomError(400, "Mã mời không hợp lệ");
          }
          await InvitationService.createInvitation(
            invitationCode,
            newUser._id.toString(),
            ses
          );
          // Kích hoạt gói quà tặng
          await SubscriptionService.handleSuccessfulPaymentAndActivateSubscription(
            newUser._id.toString(),
            process.env.DEMO_PACKAGE_ID || "68525e6fed04a7cb9f68c95d",
            ses
          );

          newUser.isSubscription = true;
          newUser.discount = true;
          newUser.type = "standard";

          if (invitationCodeInfo.codeType === "FRANCHISE_HIERARCHY") {
            // Find parent franchise details
            const parentFranchiseDetails = await FranchiseDetailsModel.findOne({
              _id: invitationCodeInfo.userId,
            }).session(ses);

            // Get parent franchise level, default to 0 if not found
            const parentFranchiseLevel =
              parentFranchiseDetails?.franchiseLevel ?? 0;

            // Calculate new franchise level (parent level + 1)
            const newFranchiseLevel = parentFranchiseLevel + 1;

            // Create new franchise details for the user
            const newFranchiseDetails = await FranchiseDetailsModel.create(
              [
                {
                  userId: newUser._id, // Link to newly created user
                  parentId: invitationCodeInfo.userId, // Set parent franchise
                  franchiseLevel: newFranchiseLevel, // Set calculated level
                  ancestorPath: [invitationCodeInfo.userId], // Initialize ancestor path with parent
                },
              ],
              { session: ses }
            );
          }
          needsSave = true;
        } else if (new Date() <= parseISO(process.env.DEMO_END_TIME!)) {
          // Đang trong thời gian demo
          await SubscriptionModel.create(
            [
              {
                userId: newUser._id,
                packageId: process.env.DEMO_PACKAGE_ID,
              },
            ],
            { session: ses }
          );

          newUser.isSubscription = true;
          needsSave = true;
        }

        // Tạo Profile (luôn truyền session)
        await ProfileService.createProfile(
          newUser._id.toString(),
          {
            height: 0,
            weight: 0,
            age: 0,
            gender: "",
            smokingStatus: 0,
          },
          ses
        );

        // Save lại user nếu có thay đổi
        if (needsSave) {
          await newUser.save({ session: ses });
        }

        return newUser; // Trả về newUser đã được cập nhật
      });

      return result;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      // Cải thiện error handling một chút
      const message = error instanceof Error ? error.message : String(error);
      throw new CustomError(500, message);
    } finally {
      await session.endSession();
    }
  }

  async login(email: string, password: string, clientId: string) {
    try {
      // Find user
      const user = await UserModel.findOne({
        $or: [
          { email: { $regex: new RegExp(`^${email}$`, "i") } },
          { username: { $regex: new RegExp(`^${email}$`, "i") } },
        ],
      });

      if (!user) {
        throw new CustomError(400, "Không tìm thấy người dùng hoặc email");
      }
      // Validate password
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        throw new CustomError(400, "Mật khẩu không hợp lệ");
      }

      // Check if user is verified
      // if (!user.verify) {
      //   try {
      //     // Delete existing OTP if any
      //     await OtpModel.deleteOne({ userId: user._id });

      //     // Generate and hash new OTP
      //     const otp = generateOTP();
      //     const hashedOtp = await hashOtp(otp);

      //     // Create OTP record with expiration
      //     await OtpModel.create({
      //       userId: user._id,
      //       otp: hashedOtp,
      //       email: user.email,
      //     });

      //     // Prepare and send email
      //     const mailOptions = {
      //       from: process.env.EMAIL_USER,
      //       to: user.email,
      //       subject: "Xác thực tài khoản - Mã OTP",
      //       html: `
      //       <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      //         <h2>Mã OTP của bạn</h2>
      //         <p>Vui lòng sử dụng mã OTP sau để xác thực tài khoản của bạn:</p>
      //         <div style="display: flex; align-items: center;">
      //           <span style="font-size: 20px; font-weight: bold; margin-right: 10px;">${otp}</span>
      //         </div>
      //         <p>Mã này sẽ hết hạn sau 10 phút.</p>
      //         <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
      //       </div>
      //       `,
      //     };

      //     const checkSendMail = await sendMail(mailOptions);
      //     if (!checkSendMail) {
      //       throw new CustomError(
      //         500,
      //         "Gửi email thất bại. Vui lòng thử lại sau."
      //       );
      //     }

      //     throw new CustomError(
      //       400,
      //       "Vui lòng kiểm tra email và xác thực tài khoản của bạn"
      //     );
      //   } catch (otpError) {
      //     if (otpError instanceof CustomError) throw otpError;
      //     throw new CustomError(500, "Lỗi trong quá trình tạo và gửi mã OTP");
      //   }
      // }

      // Generate tokens and update token record
      const [refreshToken, accessToken] = await Promise.all([
        refreshTokenGenerator(String(user._id), clientId),
        accessTokenGenerator(String(user._id), clientId),
      ]);

      await TokenModel.findOneAndUpdate(
        { userId: user._id, clientId: clientId },
        {
          token: refreshToken,
          status: "active",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        { new: true, upsert: true }
      );

      const profile = await ProfileService.getProfile(user._id.toString());

      return { user, accessToken, refreshToken, profile };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async refreshAccessToken(refreshToken: string, clientId: string) {
    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken, true) as TokenPayload;

      // Check if refresh token exists and is active in database
      const tokenDoc = await TokenModel.findOne({
        userId: decoded.userId,
        clientId: clientId,
        token: refreshToken,
        status: "active",
      });

      if (!tokenDoc) {
        throw new CustomError(
          401,
          "Refresh token không hợp lệ hoặc đã hết hạn"
        );
      }

      // Generate new tokens
      const accessToken = accessTokenGenerator(decoded.userId, clientId);
      const refreshTokenNew = refreshTokenGenerator(decoded.userId, clientId);

      // Update refresh token in database
      await TokenModel.findOneAndUpdate(
        { userId: decoded.userId, clientId: clientId },
        {
          token: refreshTokenNew,
          status: "active",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        { upsert: true, new: true }
      );

      return {
        accessToken,
        refreshToken: refreshTokenNew,
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(401, "Token làm mới không hợp lệ hoặc đã hết hạn");
    }
  }

  async logout(refreshToken: string, clientId: string) {
    try {
      const decoded = verifyTokenToLogout(refreshToken, true) as TokenPayload;
      await TokenModel.deleteOne({
        userId: decoded.userId,
        token: refreshToken,
        clientId: clientId,
      });
      return { message: "Đăng xuất thành công" };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async resetPassword(email: string, password: string) {
    try {
      // Validate input
      if (!email || !password) {
        throw new CustomError(400, "Email và mật khẩu là bắt buộc");
      }

      // Find user and verify OTP status
      const [user] = await Promise.all([UserModel.findOne({ email: email })]);

      if (!user) {
        throw new CustomError(400, "Không tìm thấy người dùng");
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      const updatedUser = await UserModel.findOneAndUpdate(
        { email: email },
        { password: hashedPassword },
        { new: true }
      );

      if (!updatedUser) {
        throw new CustomError(500, "Cập nhật mật khẩu thất bại");
      }

      await TokenModel.deleteMany({ userId: user._id });

      return {
        message: "Đặt lại mật khẩu thành công",
        email: updatedUser.email,
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    try {
      const user = await UserModel.findById(userId);

      if (!user) {
        throw new CustomError(404, "Không tìm thấy người dùng");
      }
      const isPasswordValid = await comparePasswords(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        throw new CustomError(400, "Mật khẩu hiện tại không đúng");
      }

      const hashedPassword = await hashPassword(newPassword);

      const updatedUser = await UserModel.findOneAndUpdate(
        { _id: userId },
        { password: hashedPassword },
        { new: true }
      );

      if (!updatedUser) {
        throw new CustomError(500, "Cập nhật mật khẩu thất bại");
      }

      return {
        message: "Đổi mật khẩu thành công",
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async loginWithJba(data: any, clientId: string) {
    const session = await mongoose.startSession();
    try {
      // Bắt đầu một transaction và thực hiện tất cả các thao tác liên quan bên trong
      const result = await session.withTransaction(async (ses) => {
        // Sử dụng let để có thể gán lại giá trị cho biến user
        let user = await UserModel.findOne({ email: data.email }).session(ses);

        let profile; // Khai báo biến profile để lưu trữ

        // Trường hợp 1: Người dùng CHƯA tồn tại trong hệ thống
        if (!user) {
          // 1. Tạo người dùng mới
          const createUsers = await UserModel.create(
            [
              {
                email: data.email,
                username: data.displayName,
                typeLogin: "jba",
                password: await hashPassword(
                  Math.random().toString(36).slice(-8)
                ),
              },
            ],
            { session: ses } // Quan trọng: truyền session vào thao tác create
          );
          user = createUsers[0];

          // 2. Tạo profile cho người dùng mới
          // Giả sử ProfileService.createProfile trả về profile đã tạo
          profile = await ProfileService.createProfile(
            user._id.toString(),
            {
              height: 0,
              weight: 0,
              age: 0,
              gender: "",
              smokingStatus: 0,
            },
            ses // Truyền session vào service
          );

          // 3. Tạo gói đăng ký (subscription) nếu có
          if (data.role === "silver" || data.role === "gold") {
            await SubscriptionService.handleSuccessfulPaymentAndActivateSubscription(
              user._id.toString(),
              process.env.JBA_PACKAGE_ID || "683d25bad70c0d6366e3d753",
              ses
            );
          }
          const updatedUser = await UserModel.findById(user._id).session(ses);
          if (updatedUser) {
            user = updatedUser; // Gán lại biến user với dữ liệu mới
          }
        } else {
          // Trường hợp 2: Người dùng ĐÃ tồn tại, lấy thông tin profile của họ
          profile = await ProfileService.getProfile(user._id.toString(), ses);
        }

        // Tất cả các thao tác sau đây đều nằm trong transaction
        // 4. Tạo Access Token và Refresh Token
        const [refreshToken, accessToken] = await Promise.all([
          refreshTokenGenerator(String(user._id), clientId),
          accessTokenGenerator(String(user._id), clientId),
        ]);

        // 5. Lưu (hoặc cập nhật) Refresh Token vào DB
        await TokenModel.findOneAndUpdate(
          { userId: user._id, clientId: clientId },
          {
            token: refreshToken,
            status: "active",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          // upsert: true sẽ tạo mới nếu chưa tìm thấy
          { new: true, upsert: true, session: ses }
        );

        // 6. Trả về tất cả dữ liệu cần thiết từ transaction
        return { user, accessToken, refreshToken, profile };
      }); // Kết thúc transaction

      // Transaction thành công, `result` sẽ chứa object { user, accessToken, ... }
      return result;
    } catch (error) {
      // Xử lý lỗi tập trung
      if (error instanceof CustomError) throw error;
      // Ghi log lỗi gốc để debug
      console.error("Login with JBA failed:", error);
      throw new CustomError(500, "An unexpected error occurred during login.");
    } finally {
      // Luôn luôn kết thúc session dù thành công hay thất bại
      await session.endSession();
    }
  }
}
export default new AuthService();
