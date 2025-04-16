// file: src/app/jobs/definitions/subscriptionJobs.ts

import { Agenda, Job, JobPriority } from "agenda";
import mongoose from "mongoose";
// Giả sử bạn có model User được định nghĩa bằng Mongoose
// import User from '../../models/User'; // Điều chỉnh đường dẫn nếu cần

/**
 * Định nghĩa các jobs liên quan đến quản lý subscription.
 * @param agenda Agenda instance
 */
export default async function defineSubscriptionJobs(
  agenda: Agenda
): Promise<void> {
  // --- Job: Kiểm tra và cập nhật subscription hết hạn ---
  const jobName = "check subscription expiration";
  agenda.define(
    jobName,
    {
      priority: JobPriority.high, // Ưu tiên cao
      concurrency: 1, // Chỉ chạy 1 job loại này cùng lúc trên toàn hệ thống
      // Đảm bảo an toàn khi cập nhật trạng thái nhiều user
    },
    // Hàm xử lý logic chính của job
    async (job: Job) => {
      console.log(`[Agenda][${jobName}] Running job...`);

      try {
        // **Giả định:** Model User của bạn có các trường:
        // - isSubscription: boolean
        // - subscriptionExpireDate: Date

        // Lấy collection users (hoặc dùng Mongoose Model)
        const usersCollection = mongoose.connection.db.collection("users");
        // Hoặc dùng Mongoose Model:
        // const UserModel = mongoose.model('User'); // Lấy model User

        const now = new Date();

        // Điều kiện tìm kiếm: user đang có sub và đã hết hạn
        const filter = {
          isSubscription: true,
          subscriptionExpireDate: { $lte: now },
        };

        // Nội dung cập nhật: Chuyển isSubscription thành false
        const updateDoc = {
          $set: {
            isSubscription: false,
            // Thêm các trường khác nếu cần cập nhật
            // subscriptionStatus: 'expired',
          },
        };

        // Thực hiện cập nhật
        // Dùng native driver:
        const result = await usersCollection.updateMany(filter, updateDoc);
        // Hoặc dùng Mongoose Model:
        // const result = await UserModel.updateMany(filter, updateDoc);

        if (result.modifiedCount > 0) {
          console.log(
            `[Agenda][${jobName}] Successfully updated ${result.modifiedCount} users whose subscription expired.`
          );
        } else {
          console.log(
            `[Agenda][${jobName}] No users found with expired subscriptions.`
          );
        }

        console.log(`[Agenda][${jobName}] Job completed.`);
      } catch (error) {
        console.error(`[Agenda][${jobName}] Error running job:`, error);
        // Ném lỗi để Agenda biết job thất bại và có thể retry
        throw error;
      }
    }
  );

  console.log(`[Agenda] Job '${jobName}' defined.`);

  // --- Định nghĩa các job khác liên quan đến subscription nếu cần ---
  // agenda.define('send renewal reminder', ...);
}
