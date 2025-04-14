import UserModel from "../models/User.Model";
import CustomError from "../utils/Error.Util";

class UserService {
  async getUserById(userId: string) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new CustomError(404, "User not found");
      }
      return user;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async updateUser(userId: string, data: any) {
    try {
      const user = await UserModel.findByIdAndUpdate(userId, data, {
        new: true,
      });
      if (!user) {
        throw new CustomError(404, "User not found");
      }
      return user;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async switchEmailNotification(userId: string) {
    try {
      const user = await UserModel.findByIdAndUpdate(
        userId,
        {
          $set: {
            emailNotificationsEnabled: { $not: "$emailNotificationsEnabled" },
          },
        },
        { new: true }
      );
      if (!user) {
        throw new CustomError(404, "User not found");
      }
      return user;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async updateSubscriptionStatus(userId: string, status: boolean) {
    try {
      const users = await UserModel.updateMany;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }
}

export default new UserService();
