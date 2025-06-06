import AdminService, { campaignFilter } from "../services/Admin.Service";
import { NextFunction, Request, Response } from "express";
import CustomError from "../utils/Error.Util";
import { Types } from "mongoose";

class AdminController {
  /**
   * Tạo Campaign mới
   */
  async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Bắt đầu tạo Campaign mới.");

      const {
        campaignName,
        franchiseOwnerId,
        totalAllocated,
        startDate,
        endDate,
        renewalRequirement,
      } = req.body;

      // Validate required fields
      if (
        !campaignName ||
        !franchiseOwnerId ||
        !totalAllocated ||
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin bắt buộc",
          data: null,
        });
      }

      const newCampaign = await AdminService.createAndAllocateCampaign(
        campaignName,
        franchiseOwnerId,
        parseInt(totalAllocated),
        new Date(startDate),
        new Date(endDate),
        parseInt(renewalRequirement) || 0
      );

      console.log(
        `[AdminController] Tạo Campaign thành công với ID: ${newCampaign._id}`
      );

      return res.status(201).json({
        success: true,
        message: "Tạo Campaign thành công",
        data: newCampaign,
      });
    } catch (error) {
      console.error(`[AdminController] Lỗi khi tạo Campaign: ${error}`);
      next(error);
    }
  }

  /**
   * Lấy tất cả Campaigns với filter và phân trang
   */
  async getAllCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Bắt đầu lấy danh sách Campaigns.");

      const { status, ownerId, franchiseOwnerId } = req.query as campaignFilter;
      const { page, limit, search } = req.query;

      // Tạo filter object
      let filter: campaignFilter = {};

      // Filter theo status - mặc định là active nếu không có
      if (status) {
        // Validate status values
        const validStatuses = ["active", "inactive", "expired", "deleted"];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            message:
              "Trạng thái không hợp lệ. Chỉ chấp nhận: " +
              validStatuses.join(", "),
            data: null,
          });
        }
        filter.status = status;
      } else {
        filter.status = "active"; // Mặc định chỉ lấy campaigns active
      }

      // Filter theo ownerId (deprecated, sử dụng franchiseOwnerId thay thế)
      if (ownerId) {
        filter.franchiseOwnerId = ownerId;
      }

      // Filter theo franchiseOwnerId
      if (franchiseOwnerId) {
        filter.franchiseOwnerId = franchiseOwnerId;
      }

      // Parse page và limit
      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 10;

      // Validate page và limit
      if (pageNumber < 1) {
        return res.status(400).json({
          success: false,
          message: "Số trang phải lớn hơn hoặc bằng 1",
          data: null,
        });
      }

      if (limitNumber < 1 || limitNumber > 100) {
        return res.status(400).json({
          success: false,
          message: "Số lượng items mỗi trang phải từ 1 đến 100",
          data: null,
        });
      }

      const result = await AdminService.getAllCampaigns(
        filter,
        pageNumber,
        limitNumber
      );

      console.log(
        `[AdminController] Lấy được ${result.campaigns.length} Campaigns.`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách Campaigns thành công",
        data: result,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalItems: result.total,
          itemsPerPage: limitNumber,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
        },
      });
    } catch (error) {
      console.error(
        `[AdminController] Lỗi khi lấy danh sách Campaigns: ${error}`
      );
      next(error);
    }
  }

  /**
   * Lấy thông tin chi tiết một Campaign
   */
  async getCampaignById(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Bắt đầu lấy thông tin chi tiết Campaign.");

      const { campaignId } = req.params;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: "ID Campaign không được để trống",
          data: null,
        });
      }

      const campaign = await AdminService.getCampaignById(campaignId);

      console.log(
        `[AdminController] Lấy thông tin Campaign thành công: ${campaign.campaignName}`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy thông tin Campaign thành công",
        data: campaign,
      });
    } catch (error) {
      console.error(
        `[AdminController] Lỗi khi lấy thông tin Campaign: ${error}`
      );
      next(error);
    }
  }

  /**
   * Cập nhật thông tin Campaign
   */
  async updateCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Bắt đầu cập nhật Campaign.");

      const { campaignId } = req.params;
      const updateData = req.body;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: "ID Campaign không được để trống",
          data: null,
        });
      }

      // Validate và convert số nếu cần
      if (updateData.totalAllocated) {
        updateData.totalAllocated = parseInt(updateData.totalAllocated);
      }
      if (updateData.renewalRequirement !== undefined) {
        updateData.renewalRequirement = parseInt(updateData.renewalRequirement);
      }

      const updatedCampaign = await AdminService.updateCampaign(
        campaignId,
        updateData
      );

      console.log(
        `[AdminController] Cập nhật Campaign thành công: ${updatedCampaign.campaignName}`
      );

      return res.status(200).json({
        success: true,
        message: "Cập nhật Campaign thành công",
        data: updatedCampaign,
      });
    } catch (error) {
      console.error(`[AdminController] Lỗi khi cập nhật Campaign: ${error}`);
      next(error);
    }
  }

  /**
   * Xóa Campaign (soft delete)
   */
  async deleteCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Bắt đầu xóa Campaign.");

      const { campaignId } = req.params;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: "ID Campaign không được để trống",
          data: null,
        });
      }

      const deletedCampaign = await AdminService.deleteCampaign(campaignId);

      console.log(
        `[AdminController] Xóa Campaign thành công: ${deletedCampaign.campaignName}`
      );

      return res.status(200).json({
        success: true,
        message: "Xóa Campaign thành công",
        data: deletedCampaign,
      });
    } catch (error) {
      console.error(`[AdminController] Lỗi khi xóa Campaign: ${error}`);
      next(error);
    }
  }

  /**
   * Thay đổi trạng thái Campaign
   */
  async changeCampaignStatus(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Bắt đầu thay đổi trạng thái Campaign.");

      const { campaignId } = req.params;
      const { status } = req.body;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: "ID Campaign không được để trống",
          data: null,
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái mới không được để trống",
          data: null,
        });
      }

      // Validate status
      const validStatuses = ["active", "inactive", "expired"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Trạng thái không hợp lệ. Chỉ chấp nhận: " +
            validStatuses.join(", "),
          data: null,
        });
      }

      const updatedCampaign = await AdminService.updateCampaign(campaignId, {
        status,
      });

      console.log(
        `[AdminController] Thay đổi trạng thái Campaign thành công: ${updatedCampaign.campaignName} -> ${status}`
      );

      return res.status(200).json({
        success: true,
        message: `Thay đổi trạng thái Campaign thành '${status}' thành công`,
        data: updatedCampaign,
      });
    } catch (error) {
      console.error(
        `[AdminController] Lỗi khi thay đổi trạng thái Campaign: ${error}`
      );
      next(error);
    }
  }

  /**
   * Lấy thống kê Campaigns
   */
  async getCampaignStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Bắt đầu lấy thống kê Campaigns.");

      // Lấy thống kê từng loại status
      const activeResult = await AdminService.getAllCampaigns(
        { status: "active" },
        1,
        1
      );
      const inactiveResult = await AdminService.getAllCampaigns(
        { status: "inactive" },
        1,
        1
      );
      const expiredResult = await AdminService.getAllCampaigns(
        { status: "expired" },
        1,
        1
      );

      const statistics = {
        total: {
          active: activeResult.total,
          inactive: inactiveResult.total,
          expired: expiredResult.total,
          all: activeResult.total + inactiveResult.total + expiredResult.total,
        },
        percentage: {
          active: 0,
          inactive: 0,
          expired: 0,
        },
      };

      // Tính phần trăm
      if (statistics.total.all > 0) {
        statistics.percentage.active = Math.round(
          (statistics.total.active / statistics.total.all) * 100
        );
        statistics.percentage.inactive = Math.round(
          (statistics.total.inactive / statistics.total.all) * 100
        );
        statistics.percentage.expired = Math.round(
          (statistics.total.expired / statistics.total.all) * 100
        );
      }

      console.log(`[AdminController] Lấy thống kê Campaigns thành công.`);

      return res.status(200).json({
        success: true,
        message: "Lấy thống kê Campaigns thành công",
        data: statistics,
      });
    } catch (error) {
      console.error(
        `[AdminController] Lỗi khi lấy thống kê Campaigns: ${error}`
      );
      next(error);
    }
  }

  async getCampaignPerformanceSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log("[AdminController] Bắt đầu lấy tóm tắt hiệu suất Campaign.");

      const { campaignId } = req.params;

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          message: "ID Campaign không được để trống",
          data: null,
        });
      }

      const performanceSummary =
        await AdminService.getCampaignPerformanceSummary(campaignId);

      console.log(
        `[AdminController] Lấy tóm tắt hiệu suất Campaign thành công: ${performanceSummary.campaign.campaignName}`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy tóm tắt hiệu suất Campaign thành công",
        data: performanceSummary,
      });
    } catch (error) {
      console.error(
        `[AdminController] Lỗi khi lấy tóm tắt hiệu suất Campaign: ${error}`
      );
      next(error);
    }
  }

  //GET /franchises
  async getAllFranchises(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Bắt đầu lấy danh sách Franchises.");

      // Lấy query parameters
      const { page, limit, status, level } = req.query;

      // Parse và validate page và limit
      const pageNumber = parseInt(page as string) || 1;
      const limitNumber = parseInt(limit as string) || 10;

      // Parse level nếu có
      let franchiseLevel: number | undefined;
      if (level !== undefined && level !== "") {
        franchiseLevel = parseInt(level as string);

        // Validate level là số hợp lệ
        if (isNaN(franchiseLevel) || franchiseLevel < 0) {
          return res.status(400).json({
            success: false,
            message: "Cấp franchise phải là số không âm",
            data: null,
          });
        }
      }

      // Validate status nếu có
      const validStatuses = ["active", "inactive", "suspended"]; // Thêm các status hợp lệ theo business logic
      if (status && !validStatuses.includes(status as string)) {
        return res.status(400).json({
          success: false,
          message: `Trạng thái không hợp lệ. Chỉ chấp nhận: ${validStatuses.join(
            ", "
          )}`,
          data: null,
        });
      }

      // Gọi service để lấy dữ liệu
      const result = await AdminService.getAllFranchises(
        pageNumber,
        limitNumber,
        status as string,
        franchiseLevel
      );

      console.log(
        `[AdminController] Lấy được ${result.franchises.length} Franchises.`
      );

      // Format response data
      const formattedFranchises = result.franchises.map((franchise) => ({
        _id: franchise._id,
        userId: franchise.userId,
        parentId: franchise.parentId,
        franchiseLevel: franchise.franchiseLevel,
        ancestorPath: franchise.ancestorPath,
        userTrialQuotaLedger: franchise.userTrialQuotaLedger,
        totalActiveQuota:
          franchise.userTrialQuotaLedger
            ?.filter((ledger: any) => ledger.status === "active")
            ?.reduce((sum: number, ledger: any) => {
              const available =
                ledger.totalAllocated -
                ledger.consumedByOwnInvites -
                ledger.allocatedToChildren;
              return sum + Math.max(0, available);
            }, 0) || 0,
        createdAt: franchise.createdAt,
        updatedAt: franchise.updatedAt,
      }));

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách Franchises thành công",
        data: {
          franchises: formattedFranchises,
          pagination: {
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            totalItems: result.total,
            itemsPerPage: limitNumber,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage,
          },
        },
      });
    } catch (error) {
      console.error(
        `[AdminController] Lỗi khi lấy danh sách Franchises: ${error}`
      );
      next(error);
    }
  }

  async getFranchiseHierarchy(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("[AdminController] Bắt đầu lấy cây phân cấp franchise.");

      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "ID User không được để trống",
          data: null,
        });
      }

      // Validate userId format
      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "ID User không hợp lệ",
          data: null,
        });
      }

      const hierarchyData = await AdminService.getFranchiseHierarchy(userId);

      console.log(
        `[AdminController] Lấy cây phân cấp franchise thành công cho user: ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy cây phân cấp franchise thành công",
        data: hierarchyData,
      });
    } catch (error) {
      console.error(
        `[AdminController] Lỗi khi lấy cây phân cấp franchise: ${error}`
      );
      next(error);
    }
  }

  async getFranchisePerformanceOverview(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log(
        "[AdminController] Bắt đầu lấy tổng quan hiệu suất franchise."
      );

      const { userId } = req.params;
      const { startDate, endDate, rootCampaignId } = req.query;

      // Validate userId
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "ID User không được để trống",
          data: null,
        });
      }

      if (!Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          message: "ID User không hợp lệ",
          data: null,
        });
      }

      // Validate và parse dates nếu có
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;

      if (startDate) {
        parsedStartDate = new Date(startDate as string);
        if (isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({
            success: false,
            message:
              "Định dạng startDate không hợp lệ. Sử dụng ISO format (YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm:ss.sssZ)",
            data: null,
          });
        }
      }

      if (endDate) {
        parsedEndDate = new Date(endDate as string);
        if (isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({
            success: false,
            message:
              "Định dạng endDate không hợp lệ. Sử dụng ISO format (YYYY-MM-DD hoặc YYYY-MM-DDTHH:mm:ss.sssZ)",
            data: null,
          });
        }
      }

      // Validate date range
      if (
        parsedStartDate &&
        parsedEndDate &&
        parsedStartDate >= parsedEndDate
      ) {
        return res.status(400).json({
          success: false,
          message: "startDate phải trước endDate",
          data: null,
        });
      }

      // Validate rootCampaignId nếu có
      if (rootCampaignId && !Types.ObjectId.isValid(rootCampaignId as string)) {
        return res.status(400).json({
          success: false,
          message: "ID Campaign không hợp lệ",
          data: null,
        });
      }

      // Kiểm tra xem có quá nhiều ngày không (để tránh query quá nặng)
      if (parsedStartDate && parsedEndDate) {
        const daysDifference = Math.ceil(
          (parsedEndDate.getTime() - parsedStartDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysDifference > 365) {
          return res.status(400).json({
            success: false,
            message: "Khoảng thời gian tối đa là 365 ngày",
            data: null,
          });
        }
      }

      // Call service method
      const performanceOverview =
        await AdminService.getFranchisePerformanceOverview(
          userId,
          parsedStartDate,
          parsedEndDate,
          rootCampaignId as string
        );

      console.log(
        `[AdminController] Lấy tổng quan hiệu suất franchise thành công cho user: ${userId}`
      );

      return res.status(200).json({
        success: true,
        message: "Lấy tổng quan hiệu suất franchise thành công",
        data: performanceOverview,
        meta: {
          userId: userId,
          filters: {
            startDate: parsedStartDate?.toISOString() || null,
            endDate: parsedEndDate?.toISOString() || null,
            rootCampaignId: rootCampaignId || null,
          },
          queryTimestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        `[AdminController] Lỗi khi lấy tổng quan hiệu suất franchise: ${error}`
      );
      next(error);
    }
  }
}

export default new AdminController();
