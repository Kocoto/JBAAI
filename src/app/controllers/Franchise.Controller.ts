import { Request, Response, NextFunction } from "express";
import FranchiseService from "../services/Franchise.Service";
import CustomError from "../utils/Error.Util";
import { Types } from "mongoose";
import InvitationCodeService from "../services/InvitationCode.Service";

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

  /**
   * POST /api/v1/franchise/manage-children-quota/allocate
   * Franchise Fn cấp (chia sẻ) một phần quota mời dùng thử cho franchise con Fn+1
   */
  async allocateQuotaToChild(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Bắt đầu cấp phát quota cho franchise con"
      );

      // Lấy userId của franchise đang đăng nhập
      const parentUserId = req.user?._id;

      if (!parentUserId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      // Kiểm tra role
      if (req.user?.role !== "franchise") {
        throw new CustomError(403, "Chỉ franchise mới có thể cấp phát quota");
      }

      // Lấy thông tin từ request body
      const { childFranchiseUserId, amountToAllocate, sourceLedgerEntryId } =
        req.body;

      // Validate input
      if (!childFranchiseUserId || !amountToAllocate || !sourceLedgerEntryId) {
        throw new CustomError(
          400,
          "Thiếu thông tin bắt buộc: childFranchiseUserId, amountToAllocate, sourceLedgerEntryId"
        );
      }

      if (!Types.ObjectId.isValid(childFranchiseUserId)) {
        throw new CustomError(400, "ID của franchise con không hợp lệ");
      }

      if (!Types.ObjectId.isValid(sourceLedgerEntryId)) {
        throw new CustomError(400, "ID của ledger entry không hợp lệ");
      }

      const amount = parseInt(amountToAllocate);
      if (isNaN(amount) || amount <= 0) {
        throw new CustomError(400, "Số lượng quota phải là số nguyên dương");
      }

      // Gọi service để xử lý cấp phát quota
      const result = await FranchiseService.allocateQuotaToChild(
        parentUserId,
        childFranchiseUserId,
        amount,
        sourceLedgerEntryId
      );

      console.log(
        `[FranchiseController] Cấp phát quota thành công cho franchise con: ${childFranchiseUserId}`
      );

      return res.status(200).json({
        success: true,
        message: "Cấp phát quota cho franchise con thành công",
        data: result,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Lỗi khi cấp phát quota cho franchise con: ${error}`
      );
      next(error);
    }
  }

  /**
   * PUT /api/v1/franchise/manage-children-quota/revoke-allocation/:childLedgerEntryId
   * Franchise Fn thu hồi quota đã cấp cho Fn+1
   */
  async revokeQuotaFromChild(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Bắt đầu thu hồi quota từ franchise con"
      );

      const parentUserId = req.user?._id;
      const { childLedgerEntryId } = req.params;

      if (!parentUserId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      if (req.user?.role !== "franchise") {
        throw new CustomError(403, "Chỉ franchise mới có thể thu hồi quota");
      }

      if (!childLedgerEntryId) {
        throw new CustomError(400, "ID của ledger entry không được để trống");
      }

      if (!Types.ObjectId.isValid(childLedgerEntryId)) {
        throw new CustomError(400, "ID của ledger entry không hợp lệ");
      }

      // Gọi service để xử lý thu hồi quota
      const result = await FranchiseService.revokeQuotaFromChild(
        parentUserId,
        childLedgerEntryId
      );

      console.log(
        `[FranchiseController] Thu hồi quota thành công từ ledger entry: ${childLedgerEntryId}`
      );

      return res.status(200).json({
        success: true,
        message: "Thu hồi quota từ franchise con thành công",
        data: result,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Lỗi khi thu hồi quota từ franchise con: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /api/v1/franchise/manage-children-quota/allocation-history/child/:childFranchiseUserId
   * Xem lịch sử các lần Fn đã cấp quota cho một childFranchiseUserId cụ thể
   */
  async getChildAllocationHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[FranchiseController] Bắt đầu lấy lịch sử cấp phát quota cho franchise con"
      );

      const parentUserId = req.user?._id;
      const { childFranchiseUserId } = req.params;

      if (!parentUserId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      if (req.user?.role !== "franchise") {
        throw new CustomError(
          403,
          "Chỉ franchise mới có thể xem lịch sử cấp phát quota"
        );
      }

      if (!childFranchiseUserId) {
        throw new CustomError(400, "ID của franchise con không được để trống");
      }

      if (!Types.ObjectId.isValid(childFranchiseUserId)) {
        throw new CustomError(400, "ID của franchise con không hợp lệ");
      }

      // Gọi service để lấy lịch sử cấp phát
      const allocationHistory =
        await FranchiseService.getChildAllocationHistory(
          parentUserId,
          childFranchiseUserId
        );

      console.log(
        `[FranchiseController] Lấy lịch sử cấp phát quota thành công cho franchise con: ${childFranchiseUserId}`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy lịch sử cấp phát quota thành công",
        data: allocationHistory,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Lỗi khi lấy lịch sử cấp phát quota: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /api/v1/franchise/reports/my-trial-performance
   * Franchise xem hiệu suất mời dùng thử của chính mình
   */
  async getMyTrialPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      console.log(
        "[FranchiseController] Bắt đầu lấy hiệu suất mời dùng thử của franchise"
      );

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      // Lấy query params
      const { startDate, endDate, rootCampaignId } = req.query;

      // Validate dates nếu có
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          throw new CustomError(
            400,
            "Định dạng startDate không hợp lệ. Sử dụng YYYY-MM-DD"
          );
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          throw new CustomError(
            400,
            "Định dạng endDate không hợp lệ. Sử dụng YYYY-MM-DD"
          );
        }
      }

      if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
        throw new CustomError(400, "startDate phải trước endDate");
      }

      // Validate rootCampaignId nếu có
      if (rootCampaignId && !Types.ObjectId.isValid(rootCampaignId as string)) {
        throw new CustomError(400, "ID Campaign không hợp lệ");
      }

      // Gọi service
      const performanceData =
        await FranchiseService.getFranchiseTrialPerformance(
          userId,
          parsedStartDate,
          parsedEndDate,
          rootCampaignId as string
        );

      console.log(
        `[FranchiseController] Lấy hiệu suất mời dùng thử thành công cho franchise: ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy hiệu suất mời dùng thử thành công",
        data: performanceData,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Lỗi khi lấy hiệu suất mời dùng thử: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /api/v1/franchise/reports/children-trial-performance-summary
   * Franchise xem hiệu suất tổng hợp của các franchise con trực tiếp
   */
  async getChildrenTrialPerformanceSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[FranchiseController] Bắt đầu lấy hiệu suất tổng hợp của franchise con"
      );

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      // Parse query params
      const { startDate, endDate, rootCampaignId } = req.query;

      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          throw new CustomError(400, "Định dạng startDate không hợp lệ");
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          throw new CustomError(400, "Định dạng endDate không hợp lệ");
        }
      }

      if (rootCampaignId && !Types.ObjectId.isValid(rootCampaignId as string)) {
        throw new CustomError(400, "ID Campaign không hợp lệ");
      }

      // Gọi service
      const performanceSummary =
        await FranchiseService.getChildrenPerformanceSummary(
          userId,
          parsedStartDate,
          parsedEndDate,
          rootCampaignId as string
        );

      console.log(
        `[FranchiseController] Lấy hiệu suất tổng hợp franchise con thành công`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy hiệu suất tổng hợp franchise con thành công",
        data: performanceSummary,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Lỗi khi lấy hiệu suất tổng hợp franchise con: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /api/v1/franchise/reports/child-trial-performance/:childFranchiseUserId
   * Franchise xem hiệu suất chi tiết của một franchise con cụ thể
   */
  async getSingleChildTrialPerformance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[FranchiseController] Bắt đầu lấy hiệu suất chi tiết của franchise con"
      );

      const parentUserId = req.user?._id;
      const { childFranchiseUserId } = req.params;

      if (!parentUserId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      if (!childFranchiseUserId) {
        throw new CustomError(400, "ID của franchise con không được để trống");
      }

      if (!Types.ObjectId.isValid(childFranchiseUserId)) {
        throw new CustomError(400, "ID của franchise con không hợp lệ");
      }

      // Parse query params
      const { startDate, endDate, rootCampaignId } = req.query;

      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          throw new CustomError(400, "Định dạng startDate không hợp lệ");
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          throw new CustomError(400, "Định dạng endDate không hợp lệ");
        }
      }

      if (rootCampaignId && !Types.ObjectId.isValid(rootCampaignId as string)) {
        throw new CustomError(400, "ID Campaign không hợp lệ");
      }

      // Gọi service
      const childPerformance = await FranchiseService.getSingleChildPerformance(
        parentUserId,
        childFranchiseUserId,
        parsedStartDate,
        parsedEndDate,
        rootCampaignId as string
      );

      console.log(
        `[FranchiseController] Lấy hiệu suất chi tiết franchise con thành công: ${childFranchiseUserId}`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy hiệu suất chi tiết franchise con thành công",
        data: childPerformance,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Lỗi khi lấy hiệu suất chi tiết franchise con: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /api/v1/franchise/reports/full-hierarchy-performance/:rootCampaignId?
   * Franchise xem hiệu suất của chính mình và toàn bộ cây con bên dưới
   */
  async getFullHierarchyPerformance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[FranchiseController] Bắt đầu lấy hiệu suất toàn bộ cây franchise"
      );

      const userId = req.user?._id;
      const { rootCampaignId } = req.params;

      if (!userId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      // Validate rootCampaignId nếu có
      if (rootCampaignId && !Types.ObjectId.isValid(rootCampaignId)) {
        throw new CustomError(400, "ID Campaign không hợp lệ");
      }

      // Parse query params
      const { startDate, endDate } = req.query;

      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          throw new CustomError(400, "Định dạng startDate không hợp lệ");
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          throw new CustomError(400, "Định dạng endDate không hợp lệ");
        }
      }

      // Gọi service
      const hierarchyPerformance =
        await FranchiseService.getFullHierarchyPerformance(
          userId,
          rootCampaignId,
          parsedStartDate,
          parsedEndDate
        );

      console.log(
        `[FranchiseController] Lấy hiệu suất toàn bộ cây franchise thành công`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy hiệu suất toàn bộ cây franchise thành công",
        data: hierarchyPerformance,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Lỗi khi lấy hiệu suất toàn bộ cây franchise: ${error}`
      );
      next(error);
    }
  }

  /**
   * GET /api/v1/franchise/reports/quota-utilization
   * Franchise xem tình hình sử dụng quota của chính mình và các con trực tiếp
   */
  async getQuotaUtilization(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[FranchiseController] Bắt đầu lấy thông tin sử dụng quota");

      const userId = req.user?._id;

      if (!userId) {
        throw new CustomError(
          401,
          "Không tìm thấy thông tin người dùng đăng nhập"
        );
      }

      // Gọi service
      const quotaUtilization = await FranchiseService.getQuotaUtilization(
        userId
      );

      console.log(
        `[FranchiseController] Lấy thông tin sử dụng quota thành công`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy thông tin sử dụng quota thành công",
        data: quotaUtilization,
      });
    } catch (error) {
      console.error(
        `[FranchiseController] Lỗi khi lấy thông tin sử dụng quota: ${error}`
      );
      next(error);
    }
  }
  async activeInvitationCode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const currentActiveLedgerEntryId = req.body.currentActiveLedgerEntryId;
      const sourceCampaignId = req.body.sourceCampaignId;
      if (!currentActiveLedgerEntryId) {
        throw new CustomError(400, "currentActiveLedgerEntryId là bắt buộc");
      }
      if (!Types.ObjectId.isValid(currentActiveLedgerEntryId)) {
        throw new CustomError(
          400,
          "ID currentActiveLedgerEntryId không hợp lệ"
        );
      }
      if (!Types.ObjectId.isValid(sourceCampaignId)) {
        throw new CustomError(400, "ID sourceCampaignId không hợp lệ");
      }
      const activeCode = await InvitationCodeService.activeInvitationCode(
        userId,
        currentActiveLedgerEntryId,
        sourceCampaignId
      );
      if (!activeCode) {
        throw new CustomError(400, "Không thể kích hoạt mã mời");
      }
      res.status(200).json({
        success: true,
        message: "Kích hoạt mã mời thành công",
        data: activeCode,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FranchiseController();
