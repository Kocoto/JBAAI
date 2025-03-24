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
    const user = await UserModel.findOne({
      $or: [{ email: email }, { username: email }],
    });
    if (!user) {
      throw new CustomError(400, "Không tìm thấy người dùng hoặc email");
    }
    const isPasswordValid = comparePasswords(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError(400, "Mật khẩu không hợp lệ");
    }
    const checkVerified = user.verify;
    if (!checkVerified) {
      await OtpModel.deleteOne({ userId: user._id });
      const otp = generateOTP();
      const hashedOtp = await hashOtp(otp);
      await OtpModel.create({
        userId: user._id,
        otp: hashedOtp,
        email: user.email,
      });
      console.log(
        "Đây là log dòng số 50 của file Auth.Service.ts để kiếm tra xem user đã verify chưa"
      );
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Mã OTP",
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Mã OTP của bạn</h2>
          <p>Vui lòng sử dụng mã OTP sau để tiếp tục:</p>
          <div style="display: flex; align-items: center;">
            <span style="font-size: 20px; font-weight: bold; margin-right: 10px;">${otp}</span>
          </div>
          <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!</p>
        </div>
      `,
      };

      const checkSendMail = await sendMail(mailOptions);
      if (!checkSendMail) {
        throw new CustomError(400, "Gửi email thất bại");
      }
      throw new CustomError(400, "Vui lòng xác thực email của bạn");
    }

    const refreshToken = refreshTokenGenerator(String(user._id), clientId);
    const accessToken = accessTokenGenerator(String(user._id), clientId);
    await TokenModel.findOneAndUpdate(
      { userId: user._id, clientId: clientId },
      { token: refreshToken, status: "active" },
      { new: true, upsert: true }
    );

    return { user, accessToken, refreshToken };
  }

  async refreshAccessToken(refreshToken: string, clientId: string) {
    try {
      // Verify refresh token
      const decoded = verifyToken(refreshToken, true) as TokenPayload;

      // Tối ưu: Sửa lỗi decoded._id thành decoded.userId
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
      throw new CustomError(401, "Token làm mới không hợp lệ hoặc đã hết hạn");
    }
  }

  async logout(userId: string, clientId: string) {
    const token = await TokenModel.findOneAndUpdate(
      { userId: userId, clientId: clientId },
      { status: "inactive" },
      { new: true }
    );
    return token;
  }

  async resetPassword(email: string, password: string) {
    try {
      // Validate input
      if (!email || !password) {
        throw new CustomError(400, "Email và mật khẩu là bắt buộc");
      }

      // Find user and verify OTP status
      const [user, otpDoc] = await Promise.all([
        UserModel.findOne({ email: email }),
        OtpModel.findOne({ email: email }),
      ]);

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

      return {
        message: "Đặt lại mật khẩu thành công",
        email: updatedUser.email,
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Lỗi khi đặt lại mật khẩu");
    }
  }
}
export default new AuthService();
