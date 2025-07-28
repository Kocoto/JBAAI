import { Request, Response, NextFunction } from "express";
import AuthService from "../services/Auth.Service";
import OTPService from "../services/OTP.Service";
import CustomError from "../utils/Error.Util";
import SubscriptionService from "../services/Subscription.Service";
import axios from "axios";

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
      if (!email || !password || !username) {
        throw new CustomError(
          400,
          "Email, password, username and phone number are required"
        );
      }

      // Validate address for non-standard roles
      if (role && role !== "user" && role !== "admin") {
        if (!address) {
          throw new CustomError(
            400,
            "Address is required for roles other than user"
          );
        }
      }

      // Register user and handle subscription
      const user = await AuthService.register(
        email.toLowerCase(),
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
        throw new CustomError(400, "Email, password and clientId are required");
      }

      const user = await AuthService.login(
        email.toLowerCase(),
        password,
        clientId
      );

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
      if (!refreshToken) throw new CustomError(400, "refreshToken is required");
      await AuthService.logout(refreshToken, clientId);
      res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyOTPtoLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, clientId } = req.body;
      const user = await OTPService.verifyOTPtoLogin(
        email.toLowerCase(),
        otp,
        clientId
      );
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
        throw new CustomError(400, "Email is required");
      }
      const result = await OTPService.getOTP(email.toLowerCase());
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
      const result = await OTPService.verifyOTP(email.toLowerCase(), otp);
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
      const result = await AuthService.resetPassword(
        email.toLowerCase(),
        password
      );
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
        throw new CustomError(
          400,
          "Old password and new password are required"
        );
      }
      await AuthService.changePassword(userId, oldPassword, newPassword);
      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async loginWithJba(req: Request, res: Response, next: NextFunction) {
    try {
      const { uid, clientId } = req.body;
      if (!uid || !clientId) {
        throw new CustomError(400, "Missing login information");
      }
      console.log(uid, clientId);
      const response = await axios.get(
        `https://jbabrands.com/wp-json/jba/v1/member-info/${uid}`
      );
      const data = response.data;
      console.log(data);

      if (response.status !== 200) {
        throw new CustomError(response.status, data.message);
      }
      const user = await AuthService.loginWithJba(data, clientId);
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
