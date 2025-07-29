import mongoose from "mongoose";
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
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new CustomError(404, "User not found");
      }

      user.emailNotificationsEnabled = !user.emailNotificationsEnabled;
      await user.save();

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

  async changeLanguage(userId: string, language: "vn" | "en" | "in" | "cn") {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new CustomError(404, "User not found");
      }

      user.language = language;
      await user.save();

      return user;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new CustomError(500, errorMessage);
    }
  }

  async updateManyUser() {
    try {
      const users = await UserModel.updateMany(
        { isHideScore: true },
        { isHideScore: false }
      );
      return users;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new CustomError(500, errorMessage);
    }
  }

  /**
   * Soft delete user account
   * Mark isDeleted as true and add timestamp to unique fields to avoid conflicts
   */
  async deleteMyAccount(userId: string) {
    const session = await mongoose.startSession();

    try {
      const result = await session.withTransaction(async (ses) => {
        // 1. Find user first to check existence
        const user = await UserModel.findById(userId).session(ses);
        if (!user) {
          throw new CustomError(404, "User not found");
        }

        // 2. Check if user is already deleted
        if (user.isDeleted) {
          throw new CustomError(400, "User already deleted");
        }

        // 3. Create timestamp and update all at once
        const timestamp = Date.now();
        const updateData = {
          isDeleted: true,
          deletedAt: new Date(),
          email: `${timestamp}_${user.email}`,
          username: `${timestamp}_${user.username}`,
          ...(user.phone && { phone: `${timestamp}_${user.phone}` }),
        };

        // 4. Update user with all changes at once
        const updatedUser = await UserModel.findByIdAndUpdate(
          userId,
          updateData,
          {
            new: true, // Return document after update
            session: ses,
          }
        );

        return updatedUser;
      });

      return result;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, `Error deleting account: ${error}`);
    } finally {
      await session.endSession();
    }
  }
}

export default new UserService();
