import UpgradeRequestService from "../services/UpgradeRequest.Service";
import CustomError from "../utils/Error.Util";
import { Request, Response, NextFunction } from "express";

class UpgradeRequestController {
  async createUpgradeRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?._id;
      const email = req.user?.email;
      if (!userId) throw new CustomError(400, "Không tìm thấy userId");
      const { phone, fullname, address, role } = req.body;
      if (!phone || !fullname || !address || !role) {
        throw new CustomError(400, "Vui lòng nhập đầy đủ thông tin");
      }
      const data = {
        userId,
        email,
        phone,
        fullname,
        address,
        role,
      };

      const upgradeRequest = await UpgradeRequestService.createUpgradeRequest(
        userId,
        data
      );
      res.status(201).json({
        success: true,
        message: "Tạo yêu cầu nâng cấp thành công",
        data: upgradeRequest,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UpgradeRequestController();
