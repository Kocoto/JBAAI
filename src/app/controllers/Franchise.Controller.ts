import { Request, Response, NextFunction } from "express";
import FranchiseService from "../services/Franchise.Service";
import CustomError from "../utils/Error.Util";

class FranchiseController {
  /**
   * GET /me/details
   * Lấy thông tin FranchiseDetails của franchise đang đăng nhập
   */
  async getMyFranchiseDetails(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Bắt đầu lấy thông tin franchise details của user đang đăng nhập"
      );

      // Lấy userId từ req.user (đã được set bởi middleware checkLogin)
      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      // Kiểm tra role của user
      const userRole = req.user?.role;
      if (userRole !== "franchise") {
        throw new CustomError(
          403,
          "Bạn không có quyền truy cập tính năng này. Chỉ franchise mới có thể xem thông tin này"
        );
      }

      // Gọi service để lấy thông tin
      const franchiseDetails = await FranchiseService.getMyFranchiseDetails(
        userId
      );

      console.log(
        `[FranchiseController] Lấy thông tin franchise details thành công cho user: ${userId}`
      );

      // Trả về response
      return res.status(200).json({
        success: true,
        message: "Lấy thông tin franchise thành công",
        data: franchiseDetails,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Lỗi khi lấy thông tin franchise details: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /me/quota
   * Lấy thông tin quota hiện tại của franchise
   */
  async getMyQuota(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Bắt đầu lấy thông tin quota của franchise"
      );

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      // Kiểm tra role
      if (req.user?.role !== "franchise") {
        throw new CustomError(
          403,
          "Chỉ franchise mới có thể xem thông tin quota"
        );
      }

      // Lấy thông tin franchise details để extract quota info
      const franchiseDetails = await FranchiseService.getMyFranchiseDetails(
        userId
      );

      // Chỉ trả về thông tin quota
      const quotaInfo = {
        totalActiveQuota: franchiseDetails.quotaInfo.totalActiveQuota,
        activeQuotaDetails: franchiseDetails.quotaInfo.activeQuotaDetails,
        totalLedgerEntries: franchiseDetails.quotaInfo.totalLedgerEntries,
        statistics: {
          totalInvitations: franchiseDetails.statistics.totalInvitations,
          remainingQuota: franchiseDetails.quotaInfo.totalActiveQuota,
        },
      };

      console.log(
        `[FranchiseController] Lấy thông tin quota thành công cho user: ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy thông tin quota thành công",
        data: quotaInfo,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Lỗi khi lấy thông tin quota: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /me/statistics
   * Lấy thống kê hiệu suất của franchise
   */
  async getMyStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[FranchiseController] Bắt đầu lấy thống kê franchise");

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      // Kiểm tra role
      if (req.user?.role !== "franchise") {
        throw new CustomError(403, "Chỉ franchise mới có thể xem thống kê");
      }

      // Lấy thông tin franchise details để extract statistics
      const franchiseDetails = await FranchiseService.getMyFranchiseDetails(
        userId
      );

      // Format lại statistics với thêm thông tin chi tiết
      const statistics = {
        ...franchiseDetails.statistics,
        quotaSummary: {
          totalActiveQuota: franchiseDetails.quotaInfo.totalActiveQuota,
          usedQuota: franchiseDetails.statistics.totalInvitations,
          remainingQuota: Math.max(
            0,
            franchiseDetails.quotaInfo.totalActiveQuota -
              franchiseDetails.statistics.totalInvitations
          ),
        },
        performanceMetrics: {
          conversionRate: franchiseDetails.statistics.conversionRate,
          renewalRate:
            franchiseDetails.statistics.totalTrialUsers > 0
              ? Math.round(
                  (franchiseDetails.statistics.totalRenewals /
                    franchiseDetails.statistics.totalTrialUsers) *
                    100 *
                    100
                ) / 100
              : 0,
          averagePerChild:
            franchiseDetails.statistics.directChildrenCount > 0
              ? Math.round(
                  franchiseDetails.statistics.totalInvitations /
                    franchiseDetails.statistics.directChildrenCount
                )
              : 0,
        },
      };

      console.log(
        `[FranchiseController] Lấy thống kê thành công cho user: ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy thống kê franchise thành công",
        data: statistics,
      });
    } catch (error) {
      console.error(`[FranchiseController] Lỗi khi lấy thống kê: ${error}`);
      next(error);
    }
  }

  /**
   * GET /me/invitation-codes
   * Lấy danh sách các mã mời thuộc sở hữu của franchise đang đăng nhập
   */
  async getMyInvitationCodes(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Bắt đầu lấy danh sách mã mời của franchise"
      );

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      // Kiểm tra role
      if (req.user?.role !== "franchise") {
        throw new CustomError(
          403,
          "Chỉ franchise mới có thể xem danh sách mã mời"
        );
      }

      // Gọi service để lấy danh sách invitation codes
      const invitationCodes = await FranchiseService.getMyInvitationCodes(
        userId
      );

      console.log(
        `[FranchiseController] Lấy danh sách mã mời thành công cho user: ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách mã mời thành công",
        data: invitationCodes,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Lỗi khi lấy danh sách mã mời: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /me/user-trial-quota-ledger
   * Lấy danh sách các "sổ cái" (ledger entries) quản lý quota mời dùng thử của franchise
   */
  async getMyUserTrialQuotaLedger(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[FranchiseController] Bắt đầu lấy danh sách quota ledger của franchise"
      );

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      // Kiểm tra role
      if (req.user?.role !== "franchise") {
        throw new CustomError(
          403,
          "Chỉ franchise mới có thể xem danh sách quota ledger"
        );
      }

      // Lấy query params
      const { status, rootCampaignId } = req.query;

      // Chuẩn bị filters
      const filters: {
        status?: string;
        rootCampaignId?: string;
      } = {};

      if (status && typeof status === "string") {
        filters.status = status;
      }

      if (rootCampaignId && typeof rootCampaignId === "string") {
        filters.rootCampaignId = rootCampaignId;
      }

      // Gọi service để lấy danh sách quota ledger
      const quotaLedgerEntries =
        await FranchiseService.getMyUserTrialQuotaLedger(userId, filters);

      console.log(
        `[FranchiseController] Lấy danh sách quota ledger thành công cho user: ${userId}`
      );

      // Tính tổng quan về quota
      const summary = {
        totalEntries: quotaLedgerEntries.length,
        totalAllocated: quotaLedgerEntries.reduce(
          (sum, entry) => sum + entry.totalAllocated,
          0
        ),
        totalConsumed: quotaLedgerEntries.reduce(
          (sum, entry) => sum + entry.consumedByOwnInvites,
          0
        ),
        totalAllocatedToChildren: quotaLedgerEntries.reduce(
          (sum, entry) => sum + entry.allocatedToChildren,
          0
        ),
        totalAvailable: quotaLedgerEntries.reduce(
          (sum, entry) => sum + entry.availableQuota,
          0
        ),
        statusBreakdown: {
          active: quotaLedgerEntries.filter(
            (entry) => entry.status === "active"
          ).length,
          exhausted: quotaLedgerEntries.filter(
            (entry) => entry.status === "exhausted"
          ).length,
          expired: quotaLedgerEntries.filter(
            (entry) => entry.status === "expired"
          ).length,
          paused: quotaLedgerEntries.filter(
            (entry) => entry.status === "paused"
          ).length,
        },
      };

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách quota ledger thành công",
        data: quotaLedgerEntries,
        summary: summary,
        filters: filters,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Lỗi khi lấy danh sách quota ledger: ${error}`
      );
      next(error);
    }
  }
}

export default new FranchiseController();
