import OtpModel from "../models/OTP.Model";
import TokenModel from "../models/Token.Model";
import UserModel, { IUser } from "../models/User.Model";
import CustomError from "../utils/Error.Util";
import { sendMail } from "../utils/Mail.Util";
import { compareOtp, generateOTP, hashOtp } from "../utils/OTP.Util";
import { hashPassword, comparePasswords } from "../utils/Password.Util";
import {
  accessTokenGenerator,
  refreshTokenGenerator,
  TokenPayload,
  verifyToken,
} from "../utils/Token.Util";

class AuthService {
  async register(data: IUser) {
    const [existingEmail, existingUsername] = await Promise.all([
      UserModel.findOne({ email: data.email }),
      UserModel.findOne({ username: data.username }),
    ]);

    if (existingEmail) {
      throw new CustomError(400, "Email đã tồn tại");
    }
    if (existingUsername) {
      throw new CustomError(400, "Tên người dùng đã tồn tại");
    }
    const hashedPassword = await hashPassword(data.password);
    const user = await UserModel.create({
      ...data,
      password: hashedPassword,
    });

    return user;
  }

  async login(email: string, password: string, clientId: string) {
    try {
      // Find user
      const user = await UserModel.findOne({
        $or: [{ email: email }, { username: email }],
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
        { token: refreshToken, status: "active" },
        { new: true, upsert: true }
      );

      return { user, accessToken, refreshToken };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Lỗi khi đăng nhập");
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
        { token: refreshTokenNew, status: "active" },
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

  async logout(refreshToken: string) {
    try {
      const decoded = verifyToken(refreshToken, true) as TokenPayload;
      await TokenModel.deleteOne({
        userId: decoded.userId,
        token: refreshToken,
      });
      return { message: "Đăng xuất thành công" };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Lỗi khi đăng xuất");
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
      throw new CustomError(500, "Lỗi khi đặt lại mật khẩu");
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
      throw new CustomError(500, "Lỗi khi đổi mật khẩu");
    }
  }
}
export default new AuthService();
