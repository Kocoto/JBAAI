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
import axios from "axios";

class AuthService {
  /**
   * Xử lý logic liên quan đến mã mời trong một transaction.
   * @private
   */
  private async _handleInvitationFlow(
    invitationCode: string,
    newUser: any, // Nên định nghĩa một interface cho User document
    session: mongoose.ClientSession
  ) {
    // 1. Kiểm tra và lấy thông tin mã mời
    const invitationCodeInfo = await InvitationCodeService.checkCode(
      invitationCode,
      session
    );

    if (!invitationCodeInfo) {
      throw new CustomError(400, "Mã mời không hợp lệ hoặc đã hết hạn.");
    }

    // 2. Tạo bản ghi lời mời
    await InvitationService.createInvitation(
      invitationCode,
      newUser._id.toString(),
      session
    );

    // 3. Kích hoạt gói quà tặng/subscription
    await SubscriptionService.handleSuccessfulPaymentAndActivateSubscription(
      newUser._id.toString(),
      invitationCodeInfo.packageId.toString(),
      session
    );

    // 4. Cập nhật trạng thái cho user mới
    newUser.isSubscription = true;
    newUser.discount = true;
    newUser.type = "standard"; // Hoặc dựa trên thông tin gói

    // 5. Xử lý logic phân cấp (Franchise Hierarchy)
    if (invitationCodeInfo.codeType === "FRANCHISE_HIERARCHY") {
      const parentFranchiseDetails = await FranchiseDetailsModel.findOne({
        // Tên trường `_id` rõ ràng hơn là `userId` trên invitation code
        _id: invitationCodeInfo.userId,
      }).session(session);

      const parentFranchiseLevel = parentFranchiseDetails?.franchiseLevel ?? 0;
      const newFranchiseLevel = parentFranchiseLevel + 1;

      await FranchiseDetailsModel.create(
        [
          {
            userId: newUser._id,
            parentId: invitationCodeInfo.userId,
            franchiseLevel: newFranchiseLevel,
            // Cần xây dựng ancestorPath đầy đủ hơn nếu cần
            ancestorPath: [
              ...(parentFranchiseDetails?.ancestorPath || []),
              invitationCodeInfo.userId,
            ],
          },
        ],
        { session }
      );
    }

    // 6. Cập nhật lại thông tin mã mời (quan trọng: dùng session)
    if (invitationCodeInfo.totalCumulativeUses !== undefined) {
      invitationCodeInfo.totalCumulativeUses += 1;
    }
    // **FIX QUAN TRỌNG NHẤT:** Phải truyền session vào save()
    await invitationCodeInfo.save({ session });
  }

  /**
   * Đăng ký người dùng mới
   */
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
    // 1. Hash password trước khi vào transaction
    const hashedPassword = await hashPassword(password);

    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async (ses) => {
        // 2. Kiểm tra User đã tồn tại (tối ưu hơn)
        const existingUser = await UserModel.findOne({
          $or: [{ email }, { username }, { phone }],
        }).session(ses);

        if (existingUser) {
          let message = "Thông tin đăng ký đã tồn tại.";
          if (existingUser.email === email)
            message = "Email này đã được sử dụng.";
          if (existingUser.username === username)
            message = "Username này đã được sử dụng.";
          if (phone && existingUser.phone === phone)
            message = "Số điện thoại này đã được sử dụng.";
          throw new CustomError(409, message);
        }

        // 3. Tạo đối tượng userData
        const userData: any = {
          username,
          email,
          phone,
          role: role || "user",
          password: hashedPassword,
          ...(optionEmail && { optionEmail }), // Cú pháp gọn hơn
          ...(address && { address }),
        };

        // 4. Tạo User mới
        const createdUsers = await UserModel.create([userData], {
          session: ses,
        });
        const newUser = createdUsers[0];

        // 5. Xử lý luồng mã mời nếu có (tách ra hàm riêng)
        if (invitationCode) {
          await this._handleInvitationFlow(invitationCode, newUser, ses);
        }

        // 6. Tạo Profile (luôn thực hiện)
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

        // 7. Lưu lại tất cả thay đổi trên newUser một lần duy nhất ở cuối
        // Điều này đảm bảo các thay đổi từ _handleInvitationFlow cũng được lưu
        await newUser.save({ session: ses });

        return newUser;
      });

      return result;
    } catch (error) {
      // Ném lại lỗi đã được xử lý
      if (error instanceof CustomError) throw error;

      // Bắt các lỗi khác và đóng gói lại
      const message = error instanceof Error ? error.message : String(error);
      console.error("Registration Error:", message, error); // Log lỗi để debug
      throw new CustomError(500, `Lỗi hệ thống khi đăng ký: ${message}`);
    } finally {
      // Luôn đóng session sau khi hoàn tất
      await session.endSession();
    }
  }

  // async login(email: string, password: string, clientId: string) {
  //   try {
  //     // Find user
  //     const user = await UserModel.findOne({
  //       $or: [
  //         { email: { $regex: new RegExp(`^${email}$`, "i") } },
  //         { username: { $regex: new RegExp(`^${email}$`, "i") } },
  //       ],
  //     });

  //     if (!user) {
  //       throw new CustomError(400, "Không tìm thấy người dùng hoặc email");
  //     }
  //     // Validate password
  //     const isPasswordValid = await comparePasswords(password, user.password);
  //     if (!isPasswordValid) {
  //       throw new CustomError(400, "Mật khẩu không hợp lệ");
  //     }

  //     if (user.typeLogin.type === "jba") {
  //       const uid = user.typeLogin.id;
  //       const response = await axios.get(
  //         `https://jbabrands.com/wp-json/jba/v1/member-info/${uid}`
  //       );
  //       const data = response.data;
  //       if (data.role === "silver" || data.role === "gold") {
  //         if (user.type === "normal" || user.type === "standard") {
  //           user.type = "premium";
  //         }
  //       }
  //     }
  //     await user.save();
  //     // Check if user is verified
  //     // if (!user.verify) {
  //     //   try {
  //     //     // Delete existing OTP if any
  //     //     await OtpModel.deleteOne({ userId: user._id });

  //     //     // Generate and hash new OTP
  //     //     const otp = generateOTP();
  //     //     const hashedOtp = await hashOtp(otp);

  //     //     // Create OTP record with expiration
  //     //     await OtpModel.create({
  //     //       userId: user._id,
  //     //       otp: hashedOtp,
  //     //       email: user.email,
  //     //     });

  //     //     // Prepare and send email
  //     //     const mailOptions = {
  //     //       from: process.env.EMAIL_USER,
  //     //       to: user.email,
  //     //       subject: "Xác thực tài khoản - Mã OTP",
  //     //       html: `
  //     //       <div style="font-family: Arial, sans-serif; line-height: 1.5;">
  //     //         <h2>Mã OTP của bạn</h2>
  //     //         <p>Vui lòng sử dụng mã OTP sau để xác thực tài khoản của bạn:</p>
  //     //         <div style="display: flex; align-items: center;">
  //     //           <span style="font-size: 20px; font-weight: bold; margin-right: 10px;">${otp}</span>
  //     //         </div>
  //     //         <p>Mã này sẽ hết hạn sau 10 phút.</p>
  //     //         <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
  //     //       </div>
  //     //       `,
  //     //     };

  //     //     const checkSendMail = await sendMail(mailOptions);
  //     //     if (!checkSendMail) {
  //     //       throw new CustomError(
  //     //         500,
  //     //         "Gửi email thất bại. Vui lòng thử lại sau."
  //     //       );
  //     //     }

  //     //     throw new CustomError(
  //     //       400,
  //     //       "Vui lòng kiểm tra email và xác thực tài khoản của bạn"
  //     //     );
  //     //   } catch (otpError) {
  //     //     if (otpError instanceof CustomError) throw otpError;
  //     //     throw new CustomError(500, "Lỗi trong quá trình tạo và gửi mã OTP");
  //     //   }
  //     // }

  //     // Generate tokens and update token record
  //     const [refreshToken, accessToken] = await Promise.all([
  //       refreshTokenGenerator(String(user._id), clientId),
  //       accessTokenGenerator(String(user._id), clientId),
  //     ]);

  //     await TokenModel.findOneAndUpdate(
  //       { userId: user._id, clientId: clientId },
  //       {
  //         token: refreshToken,
  //         status: "active",
  //         expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  //       },
  //       { new: true, upsert: true }
  //     );

  //     const profile = await ProfileService.getProfile(user._id.toString());

  //     return { user, accessToken, refreshToken, profile };
  //   } catch (error) {
  //     if (error instanceof CustomError) throw error;
  //     throw new CustomError(500, error as string);
  //   }
  // }
  async login(email: string, password: string, clientId: string) {
    // Bắt đầu một transaction để đảm bảo tính toàn vẹn
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async (ses) => {
        // 1. Tìm người dùng
        const user = await UserModel.findOne({
          $or: [
            { email: { $regex: new RegExp(`^${email}$`, "i") } },
            { username: { $regex: new RegExp(`^${email}$`, "i") } },
          ],
        }).session(ses); // Thêm session vào query

        if (!user) {
          throw new CustomError(400, "Email hoặc mật khẩu không chính xác");
        }

        // 2. Xác thực mật khẩu
        const isPasswordValid = await comparePasswords(password, user.password);
        if (!isPasswordValid) {
          throw new CustomError(400, "Email hoặc mật khẩu không chính xác");
        }

        // 3. Đồng bộ trạng thái với JBA nếu cần
        if (user.typeLogin?.type === "jba" && user.typeLogin?.id) {
          try {
            // Gọi API JBA để lấy trạng thái mới nhất
            const response = await axios.get(
              `https://jbabrands.com/wp-json/jba/v1/member-info/${user.typeLogin.id}`,
              { timeout: 5000 } // Đặt timeout để tránh chờ quá lâu
            );

            const jbaData = response.data;
            const isJbaPremium =
              jbaData?.role === "silver" || jbaData?.role === "gold";

            // LOGIC ĐÃ SỬA: Chỉ NÂNG CẤP, không bao giờ HẠ CẤP.
            // Nếu JBA là premium VÀ người dùng hiện tại chưa phải premium, thì mới nâng cấp.
            if (isJbaPremium && !user.isSubscription) {
              console.log(
                `Upgrading user ${user.email} to premium based on JBA status.`
              );
              user.isSubscription = true;
              user.type = "premium";

              // Lưu lại thay đổi vào DB. Cần AWAIT!
              await user.save({ session: ses });
            }
          } catch (apiError: any) {
            // Nếu API của JBA lỗi, chúng ta chỉ ghi log và cho phép người dùng đăng nhập bình thường
            // Không nên làm gián đoạn trải nghiệm của người dùng
            console.error(
              `Failed to sync status for user ${user.email} from JBA. Error:`,
              apiError.message
            );
          }
        }

        // 4. Tạo token
        const [refreshToken, accessToken] = await Promise.all([
          refreshTokenGenerator(String(user._id), clientId),
          accessTokenGenerator(String(user._id), clientId),
        ]);

        // 5. Lưu token vào DB
        await TokenModel.findOneAndUpdate(
          { userId: user._id, clientId: clientId },
          {
            token: refreshToken,
            status: "active",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          { new: true, upsert: true, session: ses } // Thêm session
        );

        // 6. Lấy profile và trả về kết quả
        const profile = await ProfileService.getProfile(
          user._id.toString(),
          ses
        );

        // Dùng lean() để lấy object thuần túy, tránh trả về các phương thức của Mongoose
        const finalUser = await UserModel.findById(user._id)
          .lean()
          .session(ses);

        return { user: finalUser, accessToken, refreshToken, profile };
      });

      return result;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      console.error("Login failed:", error);
      throw new CustomError(500, "Đã có lỗi xảy ra trong quá trình đăng nhập.");
    } finally {
      // Luôn kết thúc session
      await session.endSession();
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
    // data mong đợi: { id, email, displayName, role }
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async (ses) => {
        // Tìm người dùng trong hệ thống của bạn
        let user = await UserModel.findOne({ email: data.email }).session(ses);
        let profile;

        // Xác định xem người dùng có quyền lợi premium từ JBA không
        const isJbaPremium = data.role === "silver" || data.role === "gold";

        if (!user) {
          // KỊCH BẢN 1 & 2: Người dùng CHƯA tồn tại trong hệ thống.
          console.log(
            `User with email ${data.email} not found. Creating new user.`
          );

          // 1. Chuẩn bị dữ liệu để tạo người dùng mới
          const newUserPayload = {
            email: data.email,
            username: data.displayName,
            password: await hashPassword(Math.random().toString(36).slice(-8)),
            typeLogin: {
              type: "jba",
              id: data.id,
            },
            // Gán trạng thái premium dựa trên role từ JBA
            type: isJbaPremium ? "premium" : "normal", // hoặc 'regular'
            isSubscription: isJbaPremium,
          };

          // 2. Tạo người dùng mới
          const createdUsers = await UserModel.create([newUserPayload], {
            session: ses,
          });
          user = createdUsers[0];

          // 3. Tạo profile cho người dùng mới
          profile = await ProfileService.createProfile(
            user._id.toString(),
            { height: 0, weight: 0, age: 0, gender: "", smokingStatus: 0 },
            ses
          );

          // 4. Nếu là premium, gọi service để tạo bản ghi subscription
          if (isJbaPremium) {
            console.log(
              `Activating premium subscription for new user ${user.email}.`
            );
            // await SubscriptionService.activateJbaSubscription(
            //   user._id.toString(),
            //   data.role,
            //   ses
            // );
          }
        } else {
          // KỊCH BẢN 3, 4, 5, 6: Người dùng ĐÃ tồn tại trong hệ thống.
          console.log(`User with email ${data.email} found. Processing login.`);

          // KỊCH BẢN 3: Nâng cấp tài khoản
          // Điều kiện: JBA là premium VÀ tài khoản hiện tại của người dùng CHƯA phải premium.
          if (isJbaPremium && !user.isSubscription) {
            console.log(`Upgrading user ${user.email} to premium.`);
            user.type = "premium";
            user.isSubscription = true;

            // Gọi service để tạo bản ghi subscription
            // await SubscriptionService.activateJbaSubscription(
            //   user._id.toString(),
            //   data.role,
            //   ses
            // );

            // Lưu lại thay đổi vào DB
            await user.save({ session: ses });
          }

          // Cập nhật thông tin đăng nhập từ JBA nếu cần
          user.typeLogin = { type: "jba", id: data.id };
          await user.save({ session: ses });

          // Lấy thông tin profile đã có
          profile = await ProfileService.getProfile(user._id.toString(), ses);
        }

        // --- CÁC BƯỚC CHUNG CHO CẢ HAI TRƯỜNG HỢP ---

        // 5. Tạo Access Token và Refresh Token
        const [refreshToken, accessToken] = await Promise.all([
          refreshTokenGenerator(String(user._id), clientId),
          accessTokenGenerator(String(user._id), clientId),
        ]);

        // 6. Lưu (hoặc cập nhật) Refresh Token vào DB
        await TokenModel.findOneAndUpdate(
          { userId: user._id, clientId: clientId },
          {
            token: refreshToken,
            status: "active",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          { new: true, upsert: true, session: ses }
        );

        // 7. Trả về dữ liệu cần thiết
        // Lấy lại user từ DB để đảm bảo dữ liệu là mới nhất sau tất cả các thao tác
        const finalUser = await UserModel.findById(user._id)
          .lean()
          .session(ses);

        return { user: finalUser, accessToken, refreshToken, profile };
      });

      return result;
    } catch (error) {
      console.error("Login with JBA failed:", error);
      if (error instanceof CustomError) throw error;
      throw new CustomError(
        500,
        "An unexpected error occurred during JBA login."
      );
    } finally {
      await session.endSession();
    }
  }
}
export default new AuthService();
