import { ClientSession, Types } from "mongoose";
import UpgradeRequestModel from "../models/UpgradeRequest.Model";
import CustomError from "../utils/Error.Util";
import InvitationCodeService from "./InvitationCode.Service";
import UserService from "./User.Service";
import { FranchiseDetailsModel } from "../models/FranchiseDetails.Model";

class UpgradeRequestService {
  async createUpgradeRequest(userId: string, data: any) {
    try {
      const check = await InvitationCodeService.checkCodeIsInvalid(
        data.franchiseName
      );
      if (!check) {
        throw new CustomError(400, "Mã franchise không hợp lệ");
      }
      const newUpgradeRequest = await UpgradeRequestModel.create({
        userId,
        ...data,
      });
      if (!newUpgradeRequest) {
        throw new CustomError(400, "Tạo yêu cầu nâng cấp thất bại");
      }
      return newUpgradeRequest;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async getUpgradeRequestByUserId(userId: string, session?: ClientSession) {
    try {
      const upgradeRequest = await UpgradeRequestModel.findOne({
        userId,
      }).session(session || null);

      //cần tìm ra các fix logic chỗ này( trang profile cần gửi về nhưng có những người dùng chưa có request thì sãy ra lỗi )
      return upgradeRequest;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async getUpgradeRequestById(upgradeRequestId: string) {
    try {
      if (!upgradeRequestId.trim()) {
        throw new CustomError(400, "Id của yêu cầu không được để trống");
      }

      if (!Types.ObjectId.isValid(upgradeRequestId)) {
        throw new CustomError(400, "Id của yêu cầu không hợp lệ");
      }

      const upgradeRequest = await UpgradeRequestModel.findById(
        upgradeRequestId
      );
      if (!upgradeRequest) {
        throw new CustomError(404, "Không tìm thấy yêu cầu nâng cấp");
      }
      return upgradeRequest;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async getUpgradeRequestsByStatus(
    status: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const validPage = Math.max(1, Math.floor(page) || 1);
      const validLimit = Math.min(Math.max(1, Math.floor(limit) || 10), 100); // Giới hạn tối đa 100 items

      const countCampaigns = await UpgradeRequestModel.countDocuments({
        status,
      });
      if (!countCampaigns) {
        return {
          upgradeRequests: [],
          totalPages: 0,
          total: 0,
          currentPage: validPage,
          hasNextPage: false,
          hasPrevPage: false,
        };
      }

      const totalPages = Math.ceil(countCampaigns / validLimit);
      const skip = (validPage - 1) * validLimit;

      const upgradeRequests = await UpgradeRequestModel.find({ status })
        .skip(skip)
        .limit(validLimit);

      const hasNextPage = validPage < totalPages;
      const hasPrevPage = validPage > 1;

      return {
        upgradeRequests,
        totalPages,
        total: countCampaigns,
        currentPage: validPage,
        hasNextPage,
        hasPrevPage,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  // async updateUpgradeRequest(upgradeRequestId: string, data: any) {
  //   try {
  //     const upgradeRequest = await UpgradeRequestModel.findByIdAndUpdate(
  //       upgradeRequestId,
  //       data,
  //       { new: true }
  //     );
  //     if (!upgradeRequest) {
  //       throw new CustomError(404, "Không tìm thấy yêu cầu nâng cấp");
  //     }
  //     return upgradeRequest;
  //   } catch (error) {
  //     if (error instanceof CustomError) {
  //       throw error;
  //     }
  //     throw new CustomError(500, error as string);
  //   }
  // }

  async acceptUpgradeRequest(upgradeRequestId: string, sellerId: string) {
    try {
      const upgradeRequest = await UpgradeRequestModel.findById(
        upgradeRequestId
      );
      if (!upgradeRequest) {
        throw new CustomError(404, "Không tìm thấy yêu cầu nâng cấp");
      }
      if (upgradeRequest?.status === "reviewing") {
        throw new CustomError(
          400,
          "Yêu cầu này đã được giao cho seller khác xử lý"
        );
      }
      upgradeRequest.status = "reviewing";
      upgradeRequest.sellerId = new Types.ObjectId(sellerId);
      await upgradeRequest.save();
      return upgradeRequest;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async getUpgradeRequestBySellerId(sellerId: string, status?: string) {
    try {
      const filter: { sellerId: Types.ObjectId; status?: string } = {
        sellerId: new Types.ObjectId(sellerId), // Đảm bảo sellerId là ObjectId
      };

      if (status) {
        filter.status = status;
      }
      const upgradeRequest = await UpgradeRequestModel.find(filter);

      return upgradeRequest;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async approveUpgradeRequest(upgradeRequestId: string) {
    try {
      const upgradeRequest = await UpgradeRequestModel.findById(
        upgradeRequestId
      ).populate("userId");
      if (!upgradeRequest) {
        throw new CustomError(404, "Không tìm thấy yêu cầu nâng cấp");
      }
      if (!upgradeRequest.userId) {
        // Hoặc kiểm tra kiểu cụ thể hơn nếu bạn dùng interface/type cho User
        throw new CustomError(
          500,
          "Không thể lấy thông tin người dùng từ yêu cầu nâng cấp."
        );
      }
      upgradeRequest.status = "approved";
      const userToUpdate = upgradeRequest.userId as any;
      userToUpdate.role = upgradeRequest.role;
      userToUpdate.isSubscription = true;
      userToUpdate.franchiseName = upgradeRequest.franchiseName;
      userToUpdate.type = "premium";

      await Promise.all([
        userToUpdate.save(),
        upgradeRequest.save(),
        InvitationCodeService.createInvitationCode(
          userToUpdate._id,
          upgradeRequest.franchiseName
        ),
        FranchiseDetailsModel.create({
          userId: upgradeRequest.userId,
          parentId: null,
          franchiseLevel: 0,
          ancestorPath: [],
          userTrialQuotaLedger: [],
        }),
      ]);
      return upgradeRequest;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }
}

export default new UpgradeRequestService();
