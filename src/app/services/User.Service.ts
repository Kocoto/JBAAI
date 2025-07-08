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
   * Xóa mềm tài khoản người dùng
   * Đánh dấu isDeleted = true và thêm timestamp vào các field unique để tránh conflict
   */
  async deleteMyAccount(userId: string) {
    const session = await mongoose.startSession();

    try {
      const result = await session.withTransaction(async (ses) => {
        // 1. Tìm user trước để kiểm tra tồn tại
        const user = await UserModel.findById(userId).session(ses);
        if (!user) {
          throw new CustomError(404, "User not found");
        }

        // 2. Kiểm tra user đã bị xóa chưa
        if (user.isDeleted) {
          throw new CustomError(400, "User already deleted");
        }

        // 3. Tạo timestamp và cập nhật tất cả trong một lần
        const timestamp = Date.now();
        const updateData = {
          isDeleted: true,
          deletedAt: new Date(),
          email: `${timestamp}_${user.email}`,
          username: `${timestamp}_${user.username}`,
          ...(user.phone && { phone: `${timestamp}_${user.phone}` }),
        };

        // 4. Cập nhật user với tất cả thay đổi cùng lúc
        const updatedUser = await UserModel.findByIdAndUpdate(
          userId,
          updateData,
          {
            new: true, // Trả về document sau khi update
            session: ses,
          }
        );

        return updatedUser;
      });

      return result;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, `Lỗi khi xóa tài khoản: ${error}`);
    } finally {
      await session.endSession();
    }
  }
}

export default new UserService();
