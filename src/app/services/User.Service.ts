import UserModel from "../models/User.Model";
import CustomError from "../utils/Error.Util";
import { sendMail } from "../utils/Mail.Util";
import path from "path";
import fs from "fs/promises"; // Sử dụng fs/promises để có await

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
      // Find users matching criteria
      const users = await UserModel.find({
        isSubscription: false,
        createdAt: { $lt: new Date("2025-05-12") },
      })
        .select("email -_id")
        .sort({ createdAt: -1 });

      // Send email to each user
      let emailsSent = 0;
      for (const user of users) {
        const templatePath = path.join(
          __dirname,
          "..",
          "..",
          "..",
          "templates",
          "emails",
          "report_scan",
          "mail.html"
        );

        const mailOptions = {
          to: user.email,
          subject: "Subscription Update",
          html: await fs.readFile(
            templatePath, // Sử dụng đường dẫn tương đối đã được xây dựng
            "utf8"
          ),
          // Add other mail options as needed
        };

        await sendMail(mailOptions);
        emailsSent++;
        console.log(
          `Email sent to ${user.email} (${emailsSent}/${users.length})`
        );
      }

      return users;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new CustomError(500, errorMessage);
    }
  }
}

export default new UserService();
