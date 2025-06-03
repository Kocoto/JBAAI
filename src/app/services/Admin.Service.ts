import CampaignModel from "../models/Campaign.Model";
import { FranchiseDetailsModel } from "../models/FranchiseDetails.Model";
import InvitationModel from "../models/Invitation.Model";
import { TrialConversionLogModel } from "../models/TrialConversionLog.Model";
import UserModel from "../models/User.Model";
import CustomError from "../utils/Error.Util";
import { Types } from "mongoose";

export interface campaignFilter {
  status?: string;
  ownerId?: string;
  franchiseOwnerId?: string; // Thêm field này để filter theo franchiseOwnerId
}

export interface CampaignResponse {
  campaigns: any[];
  totalPages: number;
  total: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CampaignPerformanceSummary {
  campaign: {
    _id: string;
    campaignName: string;
    franchiseOwnerId: string;
    totalAllocated: number;
    consumedUses: number;
    totalRenewed: number;
    status: string;
    startDate: Date;
    endDate: Date;
    renewalRequirementPercentage: number;
  };
  performance: {
    // Tổng quan
    totalInvitesSent: number; // Tổng số lời mời đã gửi
    totalTrialUsers: number; // Tổng số người dùng dùng thử
    totalRenewedUsers: number; // Tổng số người dùng đã gia hạn
    conversionRate: number; // Tỷ lệ chuyển đổi (%)
    renewalRate: number; // Tỷ lệ gia hạn (%)

    // Phân tích theo cấp franchise
    performanceByLevel: {
      level: number;
      franchiseName: string;
      totalInvites: number;
      totalRenewals: number;
      conversionRate: number;
    }[];

    // Tiến độ đạt yêu cầu gia hạn
    renewalProgress: {
      required: number; // Số lượng gia hạn cần đạt
      achieved: number; // Số lượng gia hạn đã đạt
      percentage: number; // Phần trăm hoàn thành
      isQualified: boolean; // Đã đủ điều kiện cho campaign mới chưa
    };

    // Thống kê thời gian
    timeAnalysis: {
      daysActive: number; // Số ngày campaign đã hoạt động
      daysRemaining: number; // Số ngày còn lại
      averageConversionTime: number; // Thời gian chuyển đổi trung bình (ngày)
    };
  };
  // Danh sách franchise con và hiệu suất của họ
  franchiseBreakdown: {
    franchiseId: string;
    franchiseName: string;
    level: number;
    invitesSent: number;
    renewals: number;
    conversionRate: number;
  }[];
}

class AdminService {
  /**
   * Tạo và phân bổ Campaign mới từ Admin
   */
  async createAndAllocateCampaign(
    campaignName: string,
    franchiseOwnerId: string,
    totalAllocated: number,
    startDate: Date,
    endDate: Date,
    renewalRequirement: number
  ) {
    try {
      console.log("[AdminService] Bắt đầu tạo và phân bổ Campaign.");

      // Validate input parameters
      if (!campaignName?.trim()) {
        throw new CustomError(400, "Tên Campaign không được để trống");
      }
      if (!franchiseOwnerId?.trim()) {
        throw new CustomError(
          400,
          "ID của Franchise Owner không được để trống"
        );
      }
      if (totalAllocated <= 0) {
        throw new CustomError(400, "Số lượng phân bổ phải lớn hơn 0");
      }
      if (renewalRequirement < 0) {
        throw new CustomError(400, "Yêu cầu gia hạn không được âm");
      }
      if (new Date(startDate) >= new Date(endDate)) {
        throw new CustomError(400, "Ngày bắt đầu phải trước ngày kết thúc");
      }

      // Kiểm tra xem franchiseOwnerId có hợp lệ không
      if (!Types.ObjectId.isValid(franchiseOwnerId)) {
        throw new CustomError(400, "ID của Franchise Owner không hợp lệ");
      }

      // Tạo Campaign mới
      const newCampaign = await CampaignModel.create({
        campaignName: campaignName.trim(),
        franchiseOwnerId: new Types.ObjectId(franchiseOwnerId),
        allocatedByFranchiseId: null, // Campaign gốc từ admin nên parent là null
        totalAllocated: totalAllocated,
        consumedUses: 0, // Mới tạo nên chưa dùng
        status: "active", // Mặc định là active khi tạo
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        renewalRequirement: renewalRequirement,
        totalRenewed: 0, // Mới tạo nên chưa có lượt gia hạn
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (!newCampaign) {
        throw new CustomError(500, "Lỗi khi tạo Campaign trong database");
      }

      console.log(
        `[AdminService] Tạo Campaign thành công với ID: ${newCampaign._id}`
      );
      return newCampaign;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] Lỗi CustomError khi tạo Campaign: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Lỗi không xác định khi tạo Campaign: ${error}`
      );
      throw new CustomError(500, "Lỗi không xác định khi tạo Campaign");
    }
  }

  /**
   * Lấy tất cả Campaigns với filter và phân trang
   */
  async getAllCampaigns(
    campaignFilter: campaignFilter,
    page: number = 1,
    limit: number = 10
  ): Promise<CampaignResponse> {
    try {
      console.log("[AdminService] Bắt đầu lấy danh sách Campaigns.");

      // Validate và chuẩn hóa page và limit
      const validPage = Math.max(1, Math.floor(page) || 1);
      const validLimit = Math.min(Math.max(1, Math.floor(limit) || 10), 100); // Giới hạn tối đa 100 items

      // Tạo filter object cho MongoDB
      const mongoFilter: any = {};

      if (campaignFilter.status) {
        mongoFilter.status = campaignFilter.status;
      }

      if (campaignFilter.franchiseOwnerId) {
        if (!Types.ObjectId.isValid(campaignFilter.franchiseOwnerId)) {
          throw new CustomError(400, "ID của Franchise Owner không hợp lệ");
        }
        mongoFilter.franchiseOwnerId = new Types.ObjectId(
          campaignFilter.franchiseOwnerId
        );
      }

      // Đếm tổng số documents
      const countCampaigns = await CampaignModel.countDocuments(mongoFilter);

      if (countCampaigns === 0) {
        return {
          campaigns: [],
          totalPages: 0,
          total: 0,
          currentPage: validPage,
          hasNextPage: false,
          hasPrevPage: false,
        };
      }

      const totalPages = Math.ceil(countCampaigns / validLimit);
      const skip = (validPage - 1) * validLimit;

      // Lấy campaigns với populate để lấy thông tin franchise owner
      const campaigns = await CampaignModel.find(mongoFilter)
        .populate("franchiseOwnerId") // Populate thông tin cơ bản của franchise owner
        .sort({ createdAt: -1 }) // Sắp xếp theo thời gian tạo mới nhất
        .skip(skip)
        .limit(validLimit)
        .lean(); // Sử dụng lean() để tăng performance

      if (!campaigns) {
        throw new CustomError(404, "Không tìm thấy Campaign nào");
      }

      console.log(`[AdminService] Lấy được ${campaigns.length} Campaigns.`);

      return {
        campaigns,
        totalPages,
        total: countCampaigns,
        currentPage: validPage,
        hasNextPage: validPage < totalPages,
        hasPrevPage: validPage > 1,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] Lỗi CustomError khi lấy Campaign: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Lỗi không xác định khi lấy Campaign: ${error}`
      );
      throw new CustomError(500, "Lỗi không xác định khi lấy Campaign");
    }
  }

  /**
   * Lấy thông tin chi tiết một Campaign theo ID
   */
  async getCampaignById(campaignId: string) {
    try {
      console.log(`[AdminService] Lấy Campaign với ID: ${campaignId}`);

      if (!campaignId?.trim()) {
        throw new CustomError(400, "ID Campaign không được để trống");
      }

      if (!Types.ObjectId.isValid(campaignId)) {
        throw new CustomError(400, "ID Campaign không hợp lệ");
      }

      const campaign = await CampaignModel.findById(campaignId)
        .populate("franchiseOwnerId", "name email phone")
        .lean();

      if (!campaign) {
        throw new CustomError(404, "Không tìm thấy Campaign");
      }

      console.log(
        `[AdminService] Lấy Campaign thành công: ${campaign.campaignName}`
      );
      return campaign;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] Lỗi CustomError khi lấy Campaign: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Lỗi không xác định khi lấy Campaign: ${error}`
      );
      throw new CustomError(500, "Lỗi không xác định khi lấy Campaign");
    }
  }

  /**
   * Cập nhật thông tin Campaign
   */
  async updateCampaign(
    campaignId: string,
    updateData: {
      campaignName?: string;
      totalAllocated?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      renewalRequirement?: number;
    }
  ) {
    try {
      console.log(`[AdminService] Cập nhật Campaign với ID: ${campaignId}`);

      if (!campaignId?.trim()) {
        throw new CustomError(400, "ID Campaign không được để trống");
      }

      if (!Types.ObjectId.isValid(campaignId)) {
        throw new CustomError(400, "ID Campaign không hợp lệ");
      }

      // Validate dữ liệu cập nhật
      if (
        updateData.campaignName !== undefined &&
        !updateData.campaignName?.trim()
      ) {
        throw new CustomError(400, "Tên Campaign không được để trống");
      }
      if (
        updateData.totalAllocated !== undefined &&
        updateData.totalAllocated <= 0
      ) {
        throw new CustomError(400, "Số lượng phân bổ phải lớn hơn 0");
      }
      if (
        updateData.renewalRequirement !== undefined &&
        updateData.renewalRequirement < 0
      ) {
        throw new CustomError(400, "Yêu cầu gia hạn không được âm");
      }

      // Chuẩn bị dữ liệu cập nhật
      const dataToUpdate: any = {
        updatedAt: new Date(),
      };

      if (updateData.campaignName) {
        dataToUpdate.campaignName = updateData.campaignName.trim();
      }
      if (updateData.totalAllocated !== undefined) {
        dataToUpdate.totalAllocated = updateData.totalAllocated;
      }
      if (updateData.status) {
        dataToUpdate.status = updateData.status;
      }
      if (updateData.startDate) {
        dataToUpdate.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        dataToUpdate.endDate = new Date(updateData.endDate);
      }
      if (updateData.renewalRequirement !== undefined) {
        dataToUpdate.renewalRequirement = updateData.renewalRequirement;
      }

      // Kiểm tra ngày hợp lệ nếu cả startDate và endDate đều được cập nhật
      if (dataToUpdate.startDate && dataToUpdate.endDate) {
        if (dataToUpdate.startDate >= dataToUpdate.endDate) {
          throw new CustomError(400, "Ngày bắt đầu phải trước ngày kết thúc");
        }
      }

      const updatedCampaign = await CampaignModel.findByIdAndUpdate(
        campaignId,
        dataToUpdate,
        { new: true, runValidators: true }
      ).populate("franchiseOwnerId", "name email");

      if (!updatedCampaign) {
        throw new CustomError(404, "Không tìm thấy Campaign để cập nhật");
      }

      console.log(
        `[AdminService] Cập nhật Campaign thành công: ${updatedCampaign.campaignName}`
      );
      return updatedCampaign;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] Lỗi CustomError khi cập nhật Campaign: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Lỗi không xác định khi cập nhật Campaign: ${error}`
      );
      throw new CustomError(500, "Lỗi không xác định khi cập nhật Campaign");
    }
  }

  /**
   * Xóa Campaign (soft delete - chuyển status thành 'deleted')
   */
  async deleteCampaign(campaignId: string) {
    try {
      console.log(`[AdminService] Xóa Campaign với ID: ${campaignId}`);

      if (!campaignId?.trim()) {
        throw new CustomError(400, "ID Campaign không được để trống");
      }

      if (!Types.ObjectId.isValid(campaignId)) {
        throw new CustomError(400, "ID Campaign không hợp lệ");
      }

      const deletedCampaign = await CampaignModel.findByIdAndUpdate(
        campaignId,
        {
          status: "deleted",
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!deletedCampaign) {
        throw new CustomError(404, "Không tìm thấy Campaign để xóa");
      }

      console.log(
        `[AdminService] Xóa Campaign thành công: ${deletedCampaign.campaignName}`
      );
      return deletedCampaign;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] Lỗi CustomError khi xóa Campaign: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Lỗi không xác định khi xóa Campaign: ${error}`
      );
      throw new CustomError(500, "Lỗi không xác định khi xóa Campaign");
    }
  }

  async getCampaignsByFranchiseOwnerId(franchiseOwnerId: string) {
    try {
      console.log(
        "[AdminService] Lấy danh sách Campaigns theo Franchise Owner ID."
      );

      if (!franchiseOwnerId?.trim()) {
        throw new CustomError(400, "ID Franchise Owner không được để trống");
      }

      if (!Types.ObjectId.isValid(franchiseOwnerId)) {
        throw new CustomError(400, "ID Franchise Owner không hợp lệ");
      }

      const campaigns = await CampaignModel.find({ franchiseOwnerId })
        .populate("franchiseOwnerId", "name email phone")
        .lean();

      if (!campaigns) {
        throw new CustomError(404, "Không tìm thấy Campaigns");
      }

      console.log(
        `[AdminService] Lấy danh sách Campaigns thành công: ${campaigns.length} Campaigns.`
      );
      return campaigns;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] Lỗi CustomError khi lấy danh sách Campaigns: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Lỗi không xác định khi lấy danh sách Campaigns: ${error}`
      );
      throw new CustomError(
        500,
        "Lỗi không xác định khi lấy danh sách Campaigns"
      );
    }
  }

  async getCampaignPerformanceSummary(
    campaignId: string
  ): Promise<CampaignPerformanceSummary> {
    try {
      console.log(
        `[AdminService] Lấy tóm tắt hiệu suất Campaign với ID: ${campaignId}`
      );

      if (!campaignId?.trim()) {
        throw new CustomError(400, "ID Campaign không được để trống");
      }

      if (!Types.ObjectId.isValid(campaignId)) {
        throw new CustomError(400, "ID Campaign không hợp lệ");
      }

      // Lấy thông tin campaign
      const campaign = await CampaignModel.findById(campaignId).lean();
      if (!campaign) {
        throw new CustomError(404, "Không tìm thấy Campaign");
      }

      // Lấy tất cả invitations liên quan đến campaign này
      const invitations = await InvitationModel.find({
        linkedRootCampaignId: new Types.ObjectId(campaignId),
      }).lean();

      // Lấy tất cả trial conversion logs liên quan đến campaign
      const trialLogs = await TrialConversionLogModel.find({
        rootCampaignId: new Types.ObjectId(campaignId),
      }).lean();

      // Tính toán các metrics cơ bản
      const totalInvitesSent = invitations.length;
      const totalTrialUsers = trialLogs.length;
      const totalRenewedUsers = trialLogs.filter((log) => log.didRenew).length;
      const conversionRate =
        totalInvitesSent > 0
          ? Math.round((totalTrialUsers / totalInvitesSent) * 100 * 100) / 100
          : 0;
      const renewalRate =
        totalTrialUsers > 0
          ? Math.round((totalRenewedUsers / totalTrialUsers) * 100 * 100) / 100
          : 0;

      // Tính toán renewal progress
      const requiredRenewals = Math.ceil(
        (campaign.totalAllocated * campaign.renewalRequirementPercentage) / 100
      );
      const renewalProgress = {
        required: requiredRenewals,
        achieved: totalRenewedUsers,
        percentage:
          requiredRenewals > 0
            ? Math.round((totalRenewedUsers / requiredRenewals) * 100 * 100) /
              100
            : 0,
        isQualified: totalRenewedUsers >= requiredRenewals,
      };

      // Tính toán time analysis
      const now = new Date();
      const startDate = new Date(campaign.startDate || campaign.createdAt);
      const endDate = campaign.endDate ? new Date(campaign.endDate) : null;

      const daysActive = Math.floor(
        (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysRemaining = endDate
        ? Math.max(
            0,
            Math.floor(
              (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
          )
        : -1; // -1 indicates no end date

      // Tính average conversion time
      let averageConversionTime = 0;
      if (totalRenewedUsers > 0) {
        const conversionTimes = trialLogs
          .filter((log) => log.didRenew && log.renewalDate)
          .map((log) => {
            const trialStart = new Date(log.trialStartDate);
            const renewalDate = new Date(log.renewalDate!);
            return (
              (renewalDate.getTime() - trialStart.getTime()) /
              (1000 * 60 * 60 * 24)
            );
          });

        if (conversionTimes.length > 0) {
          const sum = conversionTimes.reduce((a, b) => a + b, 0);
          averageConversionTime =
            Math.round((sum / conversionTimes.length) * 10) / 10;
        }
      }

      // Lấy thông tin franchise breakdown
      const franchisePerformanceMap = new Map<
        string,
        {
          franchiseId: string;
          franchiseName: string;
          level: number;
          invitesSent: number;
          renewals: number;
        }
      >();

      // Đếm invites theo franchise
      for (const invitation of invitations) {
        const franchiseId = invitation.inviterUserId.toString();
        if (!franchisePerformanceMap.has(franchiseId)) {
          // Lấy thông tin franchise
          const franchiseDetails = await FranchiseDetailsModel.findOne({
            userId: invitation.inviterUserId,
          })
            .populate("userId", "username franchiseName")
            .lean();

          franchisePerformanceMap.set(franchiseId, {
            franchiseId,
            franchiseName:
              (franchiseDetails?.userId as any)?.franchiseName || "Unknown",
            level: franchiseDetails?.franchiseLevel || 0,
            invitesSent: 0,
            renewals: 0,
          });
        }

        const franchiseData = franchisePerformanceMap.get(franchiseId)!;
        franchiseData.invitesSent++;
      }

      // Đếm renewals theo franchise
      for (const trialLog of trialLogs) {
        if (trialLog.didRenew) {
          const franchiseId = trialLog.referringFranchiseId.toString();
          const franchiseData = franchisePerformanceMap.get(franchiseId);
          if (franchiseData) {
            franchiseData.renewals++;
          }
        }
      }

      // Chuyển map thành array và tính conversion rate
      const franchiseBreakdown = Array.from(
        franchisePerformanceMap.values()
      ).map((data) => ({
        ...data,
        conversionRate:
          data.invitesSent > 0
            ? Math.round((data.renewals / data.invitesSent) * 100 * 100) / 100
            : 0,
      }));

      // Tính performance by level
      const performanceByLevelMap = new Map<
        number,
        {
          level: number;
          franchiseName: string;
          totalInvites: number;
          totalRenewals: number;
        }
      >();

      for (const franchise of franchiseBreakdown) {
        if (!performanceByLevelMap.has(franchise.level)) {
          performanceByLevelMap.set(franchise.level, {
            level: franchise.level,
            franchiseName: `Level ${franchise.level}`,
            totalInvites: 0,
            totalRenewals: 0,
          });
        }

        const levelData = performanceByLevelMap.get(franchise.level)!;
        levelData.totalInvites += franchise.invitesSent;
        levelData.totalRenewals += franchise.renewals;
      }

      const performanceByLevel = Array.from(performanceByLevelMap.values())
        .map((data) => ({
          ...data,
          conversionRate:
            data.totalInvites > 0
              ? Math.round(
                  (data.totalRenewals / data.totalInvites) * 100 * 100
                ) / 100
              : 0,
        }))
        .sort((a, b) => a.level - b.level);

      // Cập nhật totalRenewed trong campaign nếu cần
      if (campaign.totalRenewed !== totalRenewedUsers) {
        await CampaignModel.findByIdAndUpdate(campaignId, {
          totalRenewed: totalRenewedUsers,
        });
      }

      const result: CampaignPerformanceSummary = {
        campaign: {
          _id: campaign._id.toString(),
          campaignName: campaign.campaignName,
          franchiseOwnerId: campaign.franchiseOwnerId.toString(),
          totalAllocated: campaign.totalAllocated,
          consumedUses: campaign.consumedUses,
          totalRenewed: totalRenewedUsers,
          status: campaign.status,
          startDate: campaign.startDate!,
          endDate: campaign.endDate!,
          renewalRequirementPercentage: campaign.renewalRequirementPercentage,
        },
        performance: {
          totalInvitesSent,
          totalTrialUsers,
          totalRenewedUsers,
          conversionRate,
          renewalRate,
          performanceByLevel,
          renewalProgress,
          timeAnalysis: {
            daysActive,
            daysRemaining,
            averageConversionTime,
          },
        },
        franchiseBreakdown: franchiseBreakdown.sort(
          (a, b) => b.renewals - a.renewals
        ),
      };

      console.log(`[AdminService] Lấy tóm tắt hiệu suất Campaign thành công`);
      return result;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] Lỗi CustomError khi lấy tóm tắt hiệu suất: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Lỗi không xác định khi lấy tóm tắt hiệu suất: ${error}`
      );
      throw new CustomError(
        500,
        "Lỗi không xác định khi lấy tóm tắt hiệu suất Campaign"
      );
    }
  }

  // Helper methods for top performers
  async getTopRenewersForCampaign(campaignId: string) {
    try {
      const topRenewers = await TrialConversionLogModel.aggregate([
        {
          $match: {
            rootCampaignId: new Types.ObjectId(campaignId),
            didRenew: true,
          },
        },
        {
          $group: {
            _id: "$referringFranchiseId",
            renewalCount: { $sum: 1 },
          },
        },
        {
          $sort: { renewalCount: -1 },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "franchiseInfo",
          },
        },
        {
          $unwind: "$franchiseInfo",
        },
        {
          $project: {
            franchiseId: "$_id",
            renewalCount: 1,
            franchiseName: "$franchiseInfo.franchiseName",
            username: "$franchiseInfo.username",
            email: "$franchiseInfo.email",
          },
        },
      ]);

      return topRenewers;
    } catch (error) {
      console.error(`[AdminService] Error getting top renewers: ${error}`);
      return [];
    }
  }

  async getTopInvitersForCampaign(campaignId: string) {
    try {
      const topInviters = await InvitationModel.aggregate([
        {
          $match: {
            linkedRootCampaignId: new Types.ObjectId(campaignId),
          },
        },
        {
          $group: {
            _id: "$inviterUserId",
            invitationCount: { $sum: 1 },
          },
        },
        {
          $sort: { invitationCount: -1 },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "franchiseInfo",
          },
        },
        {
          $unwind: "$franchiseInfo",
        },
        {
          $project: {
            franchiseId: "$_id",
            invitationCount: 1,
            franchiseName: "$franchiseInfo.franchiseName",
            username: "$franchiseInfo.username",
            email: "$franchiseInfo.email",
          },
        },
      ]);

      return topInviters;
    } catch (error) {
      console.error(`[AdminService] Error getting top inviters: ${error}`);
      return [];
    }
  }

  //GET /franchises
  async getAllFranchises(
    page: number,
    limit: number,
    status?: string,
    level?: number
  ) {
    try {
      const validPage = Math.max(1, Math.floor(page) || 1);
      const validLimit = Math.max(1, Math.floor(limit) || 10);

      let mongoFilter: any = {};

      if (status) {
        mongoFilter.status = status;
      }
      if (typeof level === "number") {
        mongoFilter.franchiseLevel = level;
      }

      const countFranchises = await FranchiseDetailsModel.countDocuments(
        mongoFilter
      );

      const totalPages = Math.ceil(countFranchises / validLimit);
      const skip = (validPage - 1) * validLimit;

      const franchises = await FranchiseDetailsModel.find(mongoFilter)
        .skip(skip)
        .limit(validLimit)
        .populate("userId", "username email")
        .lean();

      return {
        franchises,
        total: countFranchises,
        totalPages,
        currentPage: validPage,
        hasNextPage: validPage < totalPages,
        hasPrevPage: validPage > 1,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] Lỗi khi tìm kiếm tất cả các franchise ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Lỗi không xác định khi tìm kiếm tất cả các franchise ${error}`
      );
      throw new CustomError(
        500,
        "Lỗi không xác định khi tìm kiếm tất cả các franchise"
      );
    }
  }
}

export default new AdminService();
