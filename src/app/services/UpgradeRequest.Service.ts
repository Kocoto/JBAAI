import UpgradeRequestModel from "../models/UpgradeRequest.Model";
import CustomError from "../utils/Error.Util";

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
}

export default new UpgradeRequestService();
