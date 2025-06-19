import { Request, Response, NextFunction } from "express";
import AuthService from "../services/Auth.Service";
import OTPService from "../services/OTP.Service";
import CustomError from "../utils/Error.Util";
import SubscriptionService from "../services/Subscription.Service";

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        email,
        password,
        username,
        phone,
        role,
        address,
        invitationCode,
        optionEmail,
      } = req.body;

      // Validate required fields
      if (!email || !password || !username || !phone) {
        throw new CustomError(
          400,
          "Email, mật khẩu, tên người dùng và số điện thoại là bắt buộc"
        );
      }

      // Validate address for non-standard roles
      if (role && role !== "user" && role !== "admin") {
        if (!address) {
          throw new CustomError(
            400,
            "Địa chỉ là bắt buộc cho các vai trò khác user"
          );
        }
      }

      // Register user and handle subscription
      const user = await AuthService.register(
        email,
        password,
        username,
        phone,
        role,
        address,
        invitationCode,
        optionEmail
      );

      // Return success response
      return res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      return next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const acceptLanguage = req.headers["accept-language"];

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
      const { refreshToken, clientId } = req.body;
      if (!refreshToken) throw new CustomError(400, "refreshToken là bắt buộc");
      await AuthService.logout(refreshToken, clientId);
      res.status(200).json({
        success: true,
        message: "Đăng xuất thành công",
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
        data: {
          message: result.message,
        },
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

  async loginWithJba(req: Request, res: Response, next: NextFunction) {
    try {
      const { uid, email, role, expires_at, activated_at } = req.query;
      if (!uid || !email || !role || !expires_at || !activated_at) {
        throw new CustomError(400, "Thiếu thông tin đăng nhập");
      }
      const data = {
        uid: uid as string,
        email: email as string,
        role: role as string,
        expires_at: expires_at as string,
        activated_at: activated_at as string,
      };

      res.status(200).json({
        success: true,
        data: data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
