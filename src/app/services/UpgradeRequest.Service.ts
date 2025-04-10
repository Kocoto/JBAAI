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
