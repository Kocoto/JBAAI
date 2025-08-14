// test-monthly-job.ts
import mongoose from "mongoose";
import { monthlyReportQueue } from "../app/queues/MonthlyReport.Queue"; // Chỉnh lại đường dẫn nếu cần
import UserModel from "../app/models/User.Model"; // Chỉnh lại đường dẫn nếu cần
import { IMonthlyReportJobData } from "../app/queues/MonthlyReport.Queue"; // Chỉnh lại đường dẫn

// Hàm giả lập việc chạy scheduler cho một tháng/năm cụ thể
const runTestFor = async (testMonth: number, testYear: number) => {
  console.log(`[Test Runner] Running test for: ${testMonth}/${testYear}`);

  // Kết nối DB (nếu script chạy độc lập)
  // await mongoose.connect("YOUR_MONGO_URI"); 

  try {
    console.log(`[Test Runner] Preparing reports for ${testMonth}/${testYear}`);

    // Logic query user y hệt trong scheduler gốc
    const users = await UserModel.find({
      status: "active",
      role: "user",
      isSubscription: true,
    })
      .select("email username")
      .lean();

    if (users.length === 0) {
      console.log("[Test Runner] No users found to send reports.");
      return;
    }

    console.log(`[Test Runner] Found ${users.length} users. Queueing jobs...`);

    // Logic thêm job vào queue y hệt trong scheduler gốc
    for (const user of users) {
      const jobPayload: IMonthlyReportJobData = {
        userId: user._id.toString(),
        email: user.email,
        username: user.username,
        month: testMonth,
        year: testYear,
      };
      const jobId = `monthly-report-${user._id}-${testYear}-${testMonth}`;
      await monthlyReportQueue.add("sendMonthlyReport", jobPayload, { jobId });
    }

    console.log(`[Test Runner] Successfully queued ${users.length} monthly report jobs.`);

  } catch (error) {
    console.error("[Test Runner] Error during test run:", error);
  } finally {
    // Đóng kết nối DB và queue để script kết thúc
    await monthlyReportQueue.close();
    await mongoose.connection.close();
    console.log("[Test Runner] Test finished.");
  }
};

// --- CHẠY TEST Ở ĐÂY ---
// Gọi hàm test với tháng và năm bạn muốn kiểm tra
// Ví dụ: Test cho báo cáo tháng 7 năm 2025
runTestFor(7, 2025); 

// Ví dụ: Test lại kịch bản báo cáo tháng 6 năm 2025
// runTestFor(6, 2025);