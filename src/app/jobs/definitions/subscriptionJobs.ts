// file: src/app/jobs/definitions/subscriptionJobs.ts

import { Agenda, Job, JobPriority } from "agenda";
import mongoose from "mongoose";
import SubscriptionModel from "../../models/Subscription.Model";
import UserModel from "../../models/User.Model";
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
      const jobStartTime = Date.now();

      console.log(`[Agenda][${jobName}] Running job...`);

      try {
        const currentDate = new Date();

        const expiredSubscriptions = await SubscriptionModel.find({
          isActive: true, // Chỉ tìm những sub đang active
          endDate: { $lte: currentDate }, // Có ngày kết thúc nhỏ hơn hoặc bằng hiện tại
        })
          .select("userId _id")
          .lean(); // Chỉ lấy userId và _id, dùng lean() cho hiệu năng tốt hơn

        if (expiredSubscriptions.length === 0) {
          console.log(
            `[Agenda][${jobName}] No active subscriptions found that expired.`
          );
          console.log(
            `[Agenda][${jobName}] Job completed in ${
              Date.now() - jobStartTime
            }ms.`
          );
          return; // Kết thúc job nếu không có gì để làm
        }

        console.log(
          `[Agenda][${jobName}] Found ${expiredSubscriptions.length} expired subscriptions.`
        );

        // Lấy danh sách các subscription ID và user ID cần cập nhật
        const subscriptionIdsToUpdate = expiredSubscriptions.map(
          (sub) => sub._id
        );
        const userIdsToUpdate = expiredSubscriptions.map((sub) => sub.userId);

        // --- Bước 2: Cập nhật trạng thái isActive = false cho các subscription hết hạn ---
        console.log(
          `[Agenda][${jobName}] Updating ${subscriptionIdsToUpdate.length} subscriptions to isActive: false...`
        );
        const subUpdateResult = await SubscriptionModel.updateMany(
          { _id: { $in: subscriptionIdsToUpdate } }, // Điều kiện cập nhật theo list ID
          { $set: { isActive: false } } // Nội dung cập nhật
        );
        console.log(
          `[Agenda][${jobName}] Subscription update result: matched=${subUpdateResult.matchedCount}, modified=${subUpdateResult.modifiedCount}`
        );

        // --- Bước 3: Cập nhật trạng thái isSubscription = false cho các user tương ứng ---
        if (userIdsToUpdate.length > 0) {
          console.log(
            `[Agenda][${jobName}] Updating ${userIdsToUpdate.length} users to isSubscription: false...`
          );
          const userUpdateResult = await UserModel.updateMany(
            { _id: { $in: userIdsToUpdate } }, // Điều kiện cập nhật theo list user ID
            { $set: { isSubscription: false } } // Nội dung cập nhật
          );
          console.log(
            `[Agenda][${jobName}] User update result: matched=${userUpdateResult.matchedCount}, modified=${userUpdateResult.modifiedCount}`
          );
        } else {
          console.log(
            `[Agenda][${jobName}] No corresponding users found to update (this shouldn't normally happen if subscriptions have userIds).`
          );
        }

        console.log(
          `[Agenda][${jobName}] Job completed successfully in ${
            Date.now() - jobStartTime
          }ms.`
        );
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
