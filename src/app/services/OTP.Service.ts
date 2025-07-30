import OtpModel from "../models/OTP.Model";
import TokenModel from "../models/Token.Model";
import UserModel from "../models/User.Model";
import CustomError from "../utils/Error.Util";
import { sendMail } from "../utils/Mail.Util";
import { compareOtp, generateOTP, hashOtp } from "../utils/OTP.Util";
import { comparePasswords } from "../utils/Password.Util";
import {
  accessTokenGenerator,
  refreshTokenGenerator,
} from "../utils/Token.Util";

class OTPService {
  async verifyOTPtoLogin(email: string, otp: string, clientId: string) {
    // Tối ưu: Thêm try-catch để xử lý lỗi
    try {
      const user = await UserModel.findOne({ email: email });
      if (!user) {
        throw new CustomError(400, "User not found");
      }

      const otpDoc = await OtpModel.findOne({ userId: user._id });
      if (!otpDoc) {
        throw new CustomError(400, "OTP code does not exist or has expired");
      }

      const isValidOtp = comparePasswords(otp, otpDoc.otp);
      if (!isValidOtp) {
        throw new CustomError(400, "Invalid OTP code");
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
      throw new CustomError(500, error as string);
    }
  }

  async getOTP(email: string) {
    try {
      const user = await UserModel.findOne({ email: email });
      if (!user) {
        throw new CustomError(400, "User not found");
      }

      // Thêm kiểm tra rate limiting để tránh spam
      const existingOtp = await OtpModel.findOne({ userId: user._id });
      if (existingOtp) {
        const lastUpdated = new Date(
          existingOtp.updatedAt ?? existingOtp.createdAt ?? Date.now()
        );
        const now = new Date();
        const diffInMinutes =
          (now.getTime() - lastUpdated.getTime()) / (1000 * 60);

        if (diffInMinutes < 1) {
          throw new CustomError(
            429,
            "Please wait at least 1 minute before requesting a new OTP code"
          );
        }
      }

      const otp = generateOTP();
      const hashedOtp = await hashOtp(otp);
      await OtpModel.findOneAndUpdate(
        { userId: user._id },
        {
          otp: hashedOtp,
          email: user.email, // Đảm bảo email được lưu
        },
        { new: true, upsert: true }
      );

      const mailOptions = {
        from: '"JBA AI" <support@jbabrands.ai>', // Thêm thông tin người gửi
        to: user.email,
        subject: "Your OTP Code", // Thêm tiêu đề email
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Your OTP Code</h2>
            <p>Please use the following OTP code to continue:</p>
            <div style="display: flex; align-items: center;">
              <span style="font-size: 20px; font-weight: bold; margin-right: 10px;">${otp}</span>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>Thank you for using our service!</p>
          </div>
        `,
      };

      const checkSendMail = await sendMail(mailOptions);
      if (!checkSendMail) {
        throw new CustomError(500, "Failed to send email");
      }

      return { message: "OTP code sent successfully" };
    } catch (error) {
      // Xử lý lỗi
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async verifyOTP(email: string, otp: string) {
    try {
      if (!email || !otp) {
        throw new CustomError(400, "Email and OTP code are required");
      }

      const user = await UserModel.findOne({ email: email });
      if (!user) {
        throw new CustomError(400, "User not found");
      }

      const otpDoc = await OtpModel.findOne({ userId: user._id });
      if (!otpDoc) {
        throw new CustomError(400, "OTP code does not exist or has expired");
      }

      const isValidOtp = compareOtp(otp, otpDoc.otp);
      if (!isValidOtp) {
        await OtpModel.deleteOne({ userId: user._id });
        throw new CustomError(400, "Invalid OTP code");
      }

      await OtpModel.deleteOne({ userId: user._id });

      return {
        message: "OTP verification successful",
        userId: user._id,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }
}

export default new OTPService();
