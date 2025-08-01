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

      if (!userId) throw new CustomError(400, "UserId not found");
      const { phone, fullname, address, franchiseName } = req.body;
      const franchiseName15 = franchiseName;
      const franchiseNameUpCase = franchiseName15.toUpperCase();
      await InvitationCodeService.checkCodeIsInvalid(franchiseNameUpCase);
      if (!phone || !fullname || !address) {
        throw new CustomError(400, "Please enter all required information");
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
        message: "Upgrade request created successfully",
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
    try {
      const status = req.params.status;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await UpgradeRequestService.getUpgradeRequestsByStatus(
        status as string,
        page,
        limit
      );

      res.status(200).json({
        success: true,
        message: "Get upgrade requests list successfully",
        data: result.upgradeRequests,
        pagination: {
          total: result.total,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async acceptUpgradeRequest(req: Request, res: Response, next: NextFunction) {
    log("Reached endpoint: /upgrade-requests/:id/accept");
    try {
      const upgradeRequestId = req.params.requestId;
      const sellerId = req.user?._id;
      if (!upgradeRequestId) {
        throw new CustomError(400, "ID not found");
      }
      const upgradeRequest = await UpgradeRequestService.acceptUpgradeRequest(
        upgradeRequestId,
        sellerId
      );
      res.status(200).json({
        success: true,
        message: "Upgrade request accepted successfully",
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
        throw new CustomError(400, "ID not found");
      }
      const status = req.params.status;
      const upgradeRequest =
        await UpgradeRequestService.getUpgradeRequestBySellerId(
          sellerId,
          status
        );
      res.status(200).json({
        success: true,
        message: "Get upgrade requests list successfully",
        data: upgradeRequest,
      });
    } catch (error) {
      next(error);
    }
  }

  async approveUpgradeRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const upgradeRequestId = req.params.requestId;
      if (!upgradeRequestId) {
        throw new CustomError(400, "ID not found");
      }
      const upgradeRequest = await UpgradeRequestService.approveUpgradeRequest(
        upgradeRequestId
      );

      res.status(200).json({
        success: true,
        message: "Upgrade request approved successfully",
        data: upgradeRequest,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new UpgradeRequestController();
