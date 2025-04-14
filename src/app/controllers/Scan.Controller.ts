import { Request, Response, NextFunction } from "express";
import { transformIncomingData } from "../utils/FormatData.Util";
import CustomError from "../utils/Error.Util";

class ScanController {
  async sendMailHealthData(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const emailNotificationsEnabled = user.isSubscription;
      if (emailNotificationsEnabled === false) {
        res.status(200).json({
          message: "Người dùng không đăng ký nhận thông báo",
        });
      }
      const rawData = req.body;
    } catch (error) {}
  }
}
