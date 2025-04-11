import profileModel from "../models/Profile.Model";
import UserModel from "../models/User.Model";
import CustomError from "../utils/Error.Util";
import UpgradeRequestService from "./UpgradeRequest.Service";
class ProfileService {
  async getProfile(userId: string) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new CustomError(404, "Không tìm thấy người dùng");
      }
      let profile = await profileModel.findOne({ userId: userId });
      const upgradeRequest =
        await UpgradeRequestService.getUpgradeRequestByUserId(userId);

      return { profile, user, upgradeRequest };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async createProfile(userId: string, profile: any) {
    try {
      const newProfile = await profileModel.create({
        userId: userId,
        ...profile,
      });
      if (!newProfile) {
        throw new CustomError(400, "Không thể tạo hồ sơ");
      }
      return newProfile;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async updateProfile(userId: string, profile: any) {
    try {
      const updateProfile = await profileModel.findOneAndUpdate(
        { userId: userId },
        { ...profile },
        { new: true }
      );
      return updateProfile;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }
}

export default new ProfileService();
