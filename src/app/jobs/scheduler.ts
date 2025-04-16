// file: src/app/jobs/scheduler.ts

import { Agenda } from "agenda";

/**
 * Lên lịch cho các công việc (jobs) định kỳ trong Agenda.
 * Hàm này nên được gọi sau khi Agenda đã được khởi tạo và các jobs đã được định nghĩa.
 * @param agenda Agenda instance đã được khởi tạo và start.
 */
export default async function scheduleJobs(agenda: Agenda): Promise<void> {
  console.log("[Scheduler] Starting to schedule recurring jobs...");

  // --- Lấy múi giờ của server ---
  let systemTimeZone: string;
  try {
    // Sử dụng Intl API để lấy múi giờ IANA của hệ thống
    systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log(`[Scheduler] Detected system timezone: ${systemTimeZone}`);
  } catch (error) {
    // Dự phòng nếu Intl không hoạt động (rất hiếm) hoặc môi trường không hỗ trợ
    console.warn(
      "[Scheduler] Could not detect system timezone, defaulting to UTC.",
      error
    );
    systemTimeZone = "UTC";
  }

  // --- Lịch kiểm tra Subscription hết hạn ---
  const subscriptionJobName = "check subscription expiration";

  try {
    // Hủy bỏ lịch trình cũ có cùng tên (nếu có) trước khi đặt lịch mới.
    const numRemoved = await agenda.cancel({ name: subscriptionJobName });
    if (numRemoved) {
      console.log(
        `[Scheduler] Removed ${numRemoved} old schedules for job '${subscriptionJobName}'.`
      );
    }

    // Đặt lịch chạy job này hàng ngày vào lúc 00:01 (1 phút sau nửa đêm)
    // **SỬ DỤNG MÚI GIỜ CỦA SERVER ĐÃ LẤY ĐƯỢC**
    await agenda.every(
      "1 0 * * *", // Chạy vào 00:01 hàng ngày
      subscriptionJobName, // Tên job đã định nghĩa
      {}, // Dữ liệu kèm theo (không cần cho job này)
      {
        timezone: systemTimeZone, // **Sử dụng biến múi giờ hệ thống**
        // skipImmediate: true
      }
    );
    // Log ra múi giờ đang được sử dụng
    console.log(
      `[Scheduler] Job '${subscriptionJobName}' scheduled to run daily at 00:01 using timezone: ${systemTimeZone}.`
    );

    // --- Lên lịch cho các job định kỳ khác tại đây (nếu có) ---
    /*
    const reminderJobName = 'send face scan reminder';
    await agenda.cancel({ name: reminderJobName });
    await agenda.every(
        '30 9 * * *',
        reminderJobName,
        {},
        { timezone: systemTimeZone, skipImmediate: true } // Cũng dùng múi giờ hệ thống
    );
    console.log(`[Scheduler] Job '${reminderJobName}' scheduled to run daily at 09:30 using timezone: ${systemTimeZone}.`);
    */

    console.log("[Scheduler] Finished scheduling recurring jobs.");
  } catch (error) {
    console.error("[Scheduler] Error scheduling jobs:", error);
    // throw error; // Cân nhắc có nên dừng app nếu không đặt lịch được không
  }
}
