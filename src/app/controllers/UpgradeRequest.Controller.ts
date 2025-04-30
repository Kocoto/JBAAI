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
  async getUpgradeRequestsByStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    console.log("Đã tới đây, endpoint: /upgrade-requests/:status");

    try {
      const status = req.params.status;
      const upgradeRequests =
        await UpgradeRequestService.getUpgradeRequestsByStatus(
          status as string
        );
      res.status(200).json({
        success: true,
        message: "Lấy danh sách yêu cầu nâng cấp thành công",
        data: upgradeRequests,
      });
    } catch (error) {
      next(error);
    }
  }

  async acceptUpgradeRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const upgradeRequestId = req.params.id;
      const salerId = req.user?._id;
      if (!upgradeRequestId) {
        throw new CustomError(400, "Không tìm thấy id");
      }
      const upgradeRequest = await UpgradeRequestService.acceptUpgradeRequest(
        upgradeRequestId,
        salerId
      );
      res.status(200).json({
        success: true,
        message: "Chấp nhận yêu cầu nâng cấp thành công",
        data: upgradeRequest,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UpgradeRequestController();
