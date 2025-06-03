import CampaignModel from "../models/Campaign.Model";
import { TrialConversionLogModel } from "../models/TrialConversionLog.Model";
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

  //GET /campaigns/:campaignId/performance-summary
  async getCampaignPerformanceSummary(campaignId: string) {
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

      const campaign = await CampaignModel.findById(campaignId).lean();

      if (!campaign) {
        throw new CustomError(404, "Không tìm thấy Campaign");
      }

      // Lấy thông tin về số lượng người dùng đã đăng ký và đã sử dụng Campaign
      const totalRegistered = await TrialConversionLogModel.countDocuments({
        rootCampaignId: campaignId,
        didRenew: true,
      });
    } catch {}
  }
}

export default new AdminService();
