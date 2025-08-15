import mongoose, { Types } from "mongoose";
import UserModel from "../models/User.Model";
import CustomError from "../utils/Error.Util";
import { FranchiseDetailsModel } from "../models/FranchiseDetails.Model";

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
  async deleteUser(userId: string) {
    try {
      const user = await UserModel.findOne({
        _id: new Types.ObjectId(userId),
      });
      if (!user) {
        throw new CustomError(404, "User not found");
      }
      const deleteUser = await UserModel.updateOne(
        { _id: new Types.ObjectId(userId) },
        { isDeleted: true, deletedAt: new Date() }
      );
      if (!deleteUser) {
        throw new CustomError(500, "Undefined error after deleting user");
      }
      return deleteUser;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when deleting user: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when deleting user: ${error}`
      );
      throw new CustomError(500, "Undefined error when deleting user");
    }
  }

  async getAllUsers(page: number, limit: number) {
    try {
      const users = await UserModel.find({ isDeleted: false })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      if (!users) {
        throw new CustomError(404, "Users not found");
      }
      return users;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when getting all users: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when getting all users: ${error}`
      );
      throw new CustomError(500, "Undefined error when getting all users");
    }
  }

  async getSearchUsers(query: string, page: number, limit: number) {
    try {
      const users = await UserModel.find({
        $or: [
          { email: { $regex: query, $options: "i" } },
          { username: { $regex: query, $options: "i" } },
          { phone: { $regex: query, $options: "i" } },
          { franchiseName: { $regex: query, $options: "i" } },
        ],
      })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      if (!users) {
        throw new CustomError(404, "Users not found");
      }
      return users;
    } catch (error) {
      if (error instanceof CustomError) {
        console.error(
          `[AdminService] CustomError when searching users: ${error.message}`
        );
        throw error;
      }
      console.error(
        `[AdminService] Undefined error when searching users: ${error}`
      );
      throw new CustomError(500, "Undefined error when searching users");
    }
  }
}

export default new UserService();
