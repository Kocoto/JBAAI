import mongoose, { ClientSession, Types } from "mongoose";
import UpgradeRequestModel from "../models/UpgradeRequest.Model";
import CustomError from "../utils/Error.Util";
import InvitationCodeService from "./InvitationCode.Service";
import UserService from "./User.Service";
import { FranchiseDetailsModel } from "../models/FranchiseDetails.Model";
import { generateOTP } from "../utils/OTP.Util";
import CampaignModel from "../models/Campaign.Model";

class UpgradeRequestService {
  async createUpgradeRequest(userId: string, data: any) {
    try {
      const checkRequest = await UpgradeRequestModel.findOne({
        userId,
        status: { $ne: "rejected" },
      });
      if (checkRequest) {
        throw new CustomError(400, "You already have an upgrade request");
      }

      const check = await InvitationCodeService.checkCodeIsInvalid(
        data.franchiseName
      );
      if (!check) {
        throw new CustomError(400, "Invalid franchise code");
      }
      const newUpgradeRequest = await UpgradeRequestModel.create({
        userId,
        ...data,
      });
      if (!newUpgradeRequest) {
        throw new CustomError(400, "Failed to create upgrade request");
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

      // Need to fix the logic here (the profile page needs to be returned, but some users don't have a request, which causes an error)
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
        throw new CustomError(400, "Request ID cannot be empty");
      }

      if (!Types.ObjectId.isValid(upgradeRequestId)) {
        throw new CustomError(400, "Invalid request ID");
      }

      const upgradeRequest = await UpgradeRequestModel.findById(
        upgradeRequestId
      );
      if (!upgradeRequest) {
        throw new CustomError(404, "Upgrade request not found");
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
        throw new CustomError(404, "Upgrade request not found");
      }
      if (upgradeRequest?.status === "reviewing") {
        throw new CustomError(
          400,
          "This request has been assigned to another seller for processing"
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
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async (currentSession) => {
        const upgradeRequest = await UpgradeRequestModel.findById(
          upgradeRequestId
        )
          .populate("userId")
          .session(currentSession);

        if (!upgradeRequest) {
          throw new CustomError(404, "Upgrade request not found");
        }
        if (!upgradeRequest) {
          throw new CustomError(404, "Không tìm thấy yêu cầu nâng cấp");
        }
        if (!upgradeRequest.userId) {
          // Hoặc kiểm tra kiểu cụ thể hơn nếu bạn dùng interface/type cho User
          throw new CustomError(
            500,
            "Could not retrieve user information from the upgrade request."
          );
        }
        upgradeRequest.status = "approved";
        const userToUpdate = upgradeRequest.userId as any;
        userToUpdate.role = upgradeRequest.role;
        userToUpdate.isSubscription = true;
        userToUpdate.franchiseName = upgradeRequest.franchiseName;
        userToUpdate.type = "premium";
        const code = upgradeRequest.franchiseName.toUpperCase();
        // Thay vì Promise.all(), chạy tuần tự
        await Promise.all([
          userToUpdate.save({ session: currentSession }),
          upgradeRequest.save({ session: currentSession }),

          InvitationCodeService.createInvitationCode(
            userToUpdate._id,
            code,
            "USER_TRIAL",
            currentSession
          ),
          InvitationCodeService.createInvitationCode(
            userToUpdate._id,
            code,
            "FRANCHISE_HIERARCHY",
            currentSession
          ),

          FranchiseDetailsModel.create(
            [
              {
                userId: upgradeRequest.userId,
                parentId: upgradeRequest.userId,
                franchiseLevel: 0,
                ancestorPath: [],
                userTrialQuotaLedger: [],
              },
            ],
            { session: currentSession }
          ),
        ]);

        console.log("All steps in this attempt were successful.");
        return upgradeRequest;
      });
      return result;
    } catch (error) {
      console.error("TRANSACTION FAILED AFTER ALL ATTEMPTS:", error);
      if (error instanceof CustomError) throw error;
      throw new CustomError(
        500,
        "Could not approve the upgrade request due to a system error."
      );
    } finally {
      await session.endSession();
    }
  }
}

export default new UpgradeRequestService();
