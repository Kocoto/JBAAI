import { Types } from "mongoose";
import UpgradeRequestModel from "../models/UpgradeRequest.Model";
import CustomError from "../utils/Error.Util";
import InvitationCodeService from "./InvitationCode.Service";

class UpgradeRequestService {
  async createUpgradeRequest(userId: string, data: any) {
    try {
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

  async getUpgradeRequestByUserId(userId: string) {
    try {
      const upgradeRequest = await UpgradeRequestModel.findOne({ userId });
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

  async getUpgradeRequestsByStatus(status: string) {
    try {
      const upgradeRequests = await UpgradeRequestModel.find({ status });
      if (!upgradeRequests) {
        throw new CustomError(404, "Không tìm thấy yêu cầu nâng cấp");
      }
      return upgradeRequests;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async updateUpgradeRequest(upgradeRequestId: string, data: any) {
    try {
      const upgradeRequest = await UpgradeRequestModel.findByIdAndUpdate(
        upgradeRequestId,
        data,
        { new: true }
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

  async getUpgradeRequestBySellerId(sellerId: string) {
    try {
      const upgradeRequest = await UpgradeRequestModel.find({ sellerId });
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
      await Promise.all([
        userToUpdate.save(),
        upgradeRequest.save(),
        InvitationCodeService.createInvitationCode(userToUpdate._id),
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
