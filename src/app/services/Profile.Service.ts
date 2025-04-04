import profileModel from "../models/Profile.Model";
import CustomError from "../utils/Error.Util";
class ProfileService {
  async getProfile(userId: string) {
    try {
      const profile = await profileModel.findOne({ userId: userId });
      if (!profile) {
        throw new CustomError(404, "Không tìm thấy hồ sơ");
      }
      return profile;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async createPRofile(userId: string, profile: any) {
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
}

export default new ProfileService();
