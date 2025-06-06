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
    try {
      const currentTime = new Date();
      const demoEndTimeStr = process.env.DEMO_END_TIME;
      const demoEndTime = parseISO(demoEndTimeStr!); // Đảm bảo demoEndTimeStr không là null hoặc undefined

      const [existingEmail, existingUsername, existingPhone] =
        await Promise.all([
          UserModel.findOne({ email: email }),
          UserModel.findOne({ username: username }),
          UserModel.findOne({ phone: phone }),
        ]);
      let checkInvitationCode;
      // const splitInvitationCode = invitationCode?.slice(-6);
      if (invitationCode) {
        checkInvitationCode = await InvitationCodeService.checkCode(
          invitationCode
        );

        if (!checkInvitationCode && invitationCode !== "AQP FREE15") {
          throw new CustomError(400, "Mã mời không hợp lệ");
        }
      }

      if (existingEmail) {
        throw new CustomError(400, "Email đã tồn tại");
      }
      if (existingUsername) {
        throw new CustomError(400, "Tên người dùng đã tồn tại");
      }
      if (existingPhone) {
        throw new CustomError(400, "Số điện thoại đã tồn tại");
      }
      const hashedPassword = await hashPassword(password);
      // Create base user data object
      const userData = {
        username: username,
        email: email,
        phone: phone,
        role: role || "user",
        password: hashedPassword,
      };

      // Add optional email if provided
      if (optionEmail) {
        (userData as any).optionEmail = optionEmail;
      }

      // Create new user with prepared data
      const user = await UserModel.create(userData);
      if (!user) {
        throw new CustomError(500, "lỗi xảy ra khi tạo người dùng");
      }
      if (invitationCode) {
        const invitation = await InvitationService.createInvitation(
          invitationCode,
          user._id.toString()
        );
        if (invitationCode === "AQP FREE15" || invitation) {
          await Promise.all([
            SubscriptionService.handleSuccessfulPaymentAndActivateSubscription(
              String(user._id),
              process.env.DEMO_PACKAGE_ID || "68356a7a61d8b342093eb1fa"
            ),
            (user.isSubscription = true),
            (user.discount = true),
            (user.type = "standard"),
          ]);
          await user.save();
        }
      }

      await ProfileService.createProfile(user._id.toString(), {
        height: 0,
        weight: 0,
        age: 0,
        gender: "",
        smokingStatus: 0,
      });

      if (currentTime <= new Date(demoEndTime)) {
        console.log("Đang trong thời gian demo");
        const subscription = await SubscriptionModel.create({
          userId: user._id,
          packageId: process.env.DEMO_PACKAGE_ID,
        });
        user.isSubscription = true;
        await user.save();
        console.log("Đã tạo subscription");

        if (!subscription) {
          throw new CustomError(500, "Tạo subscription thất bại");
        }
      }
      return user;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
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
}
export default new AuthService();
