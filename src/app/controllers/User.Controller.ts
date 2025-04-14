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
}
export default new UserController();
