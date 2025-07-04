import { Request, Response, NextFunction } from "express";
import UserService from "../services/User.Service";
import CustomError from "../utils/Error.Util";

class UserController {
  async swtichNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const userId = user._id;
      const isSubscription = await UserService.switchEmailNotification(userId);
      if (!isSubscription) {
        throw new CustomError(400, "Không thể cập nhật thông tin người dùng");
      }
      return res.status(200).json({
        message: "Cập nhật thông tin người dùng thành công",
        isSubscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async changeLanguage(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const userId = user._id;
      const language = req.body.language;
      if (!language) {
        throw new CustomError(400, "Vui lòng nhập ngôn ngữ");
      }
      if (
        language !== "vn" &&
        language !== "en" &&
        language !== "in" &&
        language !== "cn"
      ) {
        throw new CustomError(400, "Ngôn ngữ không hợp lệ");
      }
      const isChangeLanguage = await UserService.changeLanguage(
        userId,
        language
      );
      if (!isChangeLanguage) {
        throw new CustomError(400, "Không thể cập nhật thông tin người dùng");
      }
      return res.status(200).json({
        message: "Cập nhật thông tin người dùng thành công",
        isChangeLanguage,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateManyUser(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await UserService.updateManyUser();

      return res.status(200).json({
        success: true,
        message: "Cập nhật thông tin người dùng thành công",
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMyAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const userId = user._id;
      const isDelete = await UserService.deleteMyAccount(userId);
      if (!isDelete) {
        throw new CustomError(400, "Không thể xóa tài khoản");
      }
      return res.status(200).json({
        message: "Xóa tài khoản thành công",
        isDelete,
      });
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }
}
export default new UserController();
