import { log } from "console";
import UpgradeRequestService from "../services/UpgradeRequest.Service";
import CustomError from "../utils/Error.Util";
import { Request, Response, NextFunction } from "express";
import InvitationCodeService from "../services/InvitationCode.Service";

class UpgradeRequestController {
  async createUpgradeRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?._id;
      const email = req.user?.email;

      if (!userId) throw new CustomError(400, "Không tìm thấy userId");
      const { phone, fullname, address, franchiseName } = req.body;
      const franchiseName15 = franchiseName + "15";
      const franchiseNameUpCase = franchiseName15.toUpperCase();
      await InvitationCodeService.checkCodeIsInvalid(franchiseNameUpCase);
      if (!phone || !fullname || !address) {
        throw new CustomError(400, "Vui lòng nhập đầy đủ thông tin");
      }
      const data = {
        userId,
        email,
        phone,
        fullname,
        address,
        franchiseName: franchiseNameUpCase,
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
    // console.log("Đã tới đây, endpoint: /upgrade-requests/:status");

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
    log("Đã tới đây, endpoint: /upgrade-requests/:id/accept");
    try {
      const upgradeRequestId = req.params.upgradeRequestId;
      const sellerId = req.user?._id;
      if (!upgradeRequestId) {
        throw new CustomError(400, "Không tìm thấy id");
      }
      const upgradeRequest = await UpgradeRequestService.acceptUpgradeRequest(
        upgradeRequestId,
        sellerId
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

  async getUpgradeRequestBySellerId(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const sellerId = req.user?._id;
      if (!sellerId) {
        throw new CustomError(400, "Không tìm thấy id");
      }
      const status = req.params.status;
      const upgradeRequest =
        await UpgradeRequestService.getUpgradeRequestBySellerId(
          sellerId,
          status
        );
      res.status(200).json({
        success: true,
        message: "Lấy danh sách yêu cầu nâng cấp thành công",
        data: upgradeRequest,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveUpgradeRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const upgradeRequestId = req.params.upgradeRequestId;
      if (!upgradeRequestId) {
        throw new CustomError(400, "Không tìm thấy id");
      }
      const upgradeRequest = await UpgradeRequestService.approveUpgradeRequest(
        upgradeRequestId
      );
      res.status(200).json({
        success: true,
        message: "Xác nhận yêu cầu nâng cấp thành công",
        data: upgradeRequest,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UpgradeRequestController();
