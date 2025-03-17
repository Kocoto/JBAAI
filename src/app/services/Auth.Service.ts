import OtpModel from "../models/OTP.Model";
import TokenModel from "../models/Token.Model";
import UserModel, { IUser } from "../models/User.Model";
import CustomError from "../utils/Error.Util";
import { sendMail } from "../utils/Mail.Util";
import { generateOTP, hashOtp } from "../utils/OTP.Util";
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
      throw new CustomError(400, "Email already exists");
    }
    if (existingUsername) {
      throw new CustomError(400, "Username already exists");
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
      throw new CustomError(400, "User or email not found");
    }
    const isPasswordValid = comparePasswords(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError(400, "Invalid password");
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
        from: "duoc6694@gmail.com",
        to: user.email,
        subject: "OTP",
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Your OTP Code</h2>
          <p>Please use the following OTP code to proceed:</p>
          <div style="display: flex; align-items: center;">
            <span style="font-size: 20px; font-weight: bold; margin-right: 10px;">${otp}</span>
          </div>
          <p>Thank you for using our service!</p>
        </div>
      `,
      };

      const checkSendMail = await sendMail(mailOptions);
      if (!checkSendMail) {
        throw new CustomError(400, "Send mail failed");
      }
      throw new CustomError(400, "Please verify your email");
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
      // Tối ưu: Xử lý lỗi token hết hạn
      throw new CustomError(401, "Invalid or expired refresh token");
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

  async verifyOTP(email: string, otp: string, clientId: string) {
    // Tối ưu: Thêm try-catch để xử lý lỗi
    try {
      const user = await UserModel.findOne({ email: email });
      if (!user) {
        throw new CustomError(400, "User not found");
      }

      const otpDoc = await OtpModel.findOne({ userId: user._id });
      if (!otpDoc) {
        throw new CustomError(400, "OTP not found or expired");
      }

      const isValidOtp = comparePasswords(otp, otpDoc.otp);
      if (!isValidOtp) {
        throw new CustomError(400, "Invalid OTP");
      }

      // Tối ưu: Thực hiện các thao tác cập nhật song song
      const [updatedUser] = await Promise.all([
        UserModel.findOneAndUpdate(
          { _id: user._id },
          { verify: true },
          { new: true }
        ),
        OtpModel.deleteOne({ userId: user._id }),
      ]);

      // Tạo token
      const refreshToken = refreshTokenGenerator(String(user._id), clientId);
      const accessToken = accessTokenGenerator(String(user._id), clientId);

      await TokenModel.findOneAndUpdate(
        { userId: user._id, clientId: clientId },
        { token: refreshToken, status: "active" },
        { new: true, upsert: true }
      );

      return { user: updatedUser, accessToken, refreshToken };
    } catch (error) {
      // Xử lý lỗi
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Error verifying OTP");
    }
  }
}
export default new AuthService();
