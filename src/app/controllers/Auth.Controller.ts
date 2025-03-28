import { Request, Response, NextFunction } from "express";
import AuthService from "../services/Auth.Service";
import OTPService from "../services/OTP.Service";
import CustomError from "../utils/Error.Util";

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, username, phone } = req.body;
      if (!email || !password || !username || !phone) {
        throw new CustomError(
          400,
          "Email, mật khẩu, tên người dùng và số điện thoại là bắt buộc"
        );
      }
      const user = await AuthService.register(req.body);
      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, clientId } = req.body;
      // Validate input
      if (!email || !password || !clientId) {
        throw new CustomError(400, "Email, mật khẩu và clientId là bắt buộc");
      }

      const user = await AuthService.login(email, password, clientId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken, clientId } = req.body;
      const token = await AuthService.refreshAccessToken(
        refreshToken,
        clientId
      );
      res.status(200).json({
        success: true,
        token,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) throw new CustomError(400, "refreshToken là bắt buộc");
      await AuthService.logout(refreshToken);
      res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyOTPtoLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, clientId } = req.body;
      const user = await OTPService.verifyOTPtoLogin(email, otp, clientId);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      // Validate input
      if (!email) {
        throw new CustomError(400, "Email là bắt buộc");
      }
      const result = await OTPService.getOTP(email);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;
      const result = await OTPService.verifyOTP(email, otp);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.resetPassword(email, password);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user?._id;
      if (!userId || !oldPassword || !newPassword) {
        throw new CustomError(400, "Mật khẩu cũ, mật khẩu mới là bắt buộc");
      }
      await AuthService.changePassword(userId, oldPassword, newPassword);
      return res.status(200).json({
        success: true,
        message: "Thay đổi mật khẩu thành công",
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
