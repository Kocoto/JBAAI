import cron from "node-cron";
import UserModel from "../models/User.Model";
import {
  monthlyReportQueue,
  IMonthlyReportJobData,
} from "../queues/MonthlyReport.Queue";

export const scheduleMonthlyReportJobs = () => {
  cron.schedule(
    "* * * * *",
    async () => {
      console.log("[Scheduler] Running monthly report job scheduler...");

      try {
        const now = new Date();
        console.log("[Scheduler][Debug] Current date:", now.toISOString());

        const lastMonthDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          1
        );
        console.log(
          "[Scheduler][Debug] Last month date:",
          lastMonthDate.toISOString()
        );

        const reportMonth = lastMonthDate.getMonth() + 1; // getMonth() là 0-11
        const reportYear = lastMonthDate.getFullYear();
        console.log("[Scheduler][Debug] Report period details:", {
          reportMonth,
          reportYear,
          monthName: lastMonthDate.toLocaleString("en-US", { month: "long" }),
        });
        console.log(
          `[Scheduler] Preparing reports for ${reportMonth}/${reportYear}`
        );

        const users = await UserModel.find({
          status: "active", // Chỉ gửi cho user active
          role: "user", // Chỉ gửi cho role 'user'
          // Thêm điều kiện isSubscription: true nếu bạn chỉ muốn gửi cho người dùng trả phí
          isSubscription: true,
        })
          .select("email username")
          .lean();
        if (users.length === 0) {
          console.log("[Scheduler] No users found to send reports.");
          return;
        }

        console.log(
          `[Scheduler] Found ${users.length} users. Queueing jobs...`
        );

        for (const user of users) {
          const jobPayload: IMonthlyReportJobData = {
            userId: user._id.toString(),
            email: "duocnn130901@gmail.com",
            username: user.username,
            month: reportMonth,
            year: reportYear,
          };
          // Tạo job id duy nhất để tránh job bị lặp lại nếu scheduler chạy lại
          const jobId = `monthly-report-${user._id}-${reportYear}-${reportMonth}`;
          await monthlyReportQueue.add("sendMonthlyReport", jobPayload, {
            jobId,
          });
        }
        console.log(
          `[Scheduler] Successfully queued ${users.length} monthly report jobs.`
        );
      } catch (error) {
        console.error(
          "[Scheduler] Error running monthly report scheduler:",
          error
        );
      }
    },
    {
      noOverlap: true,
      timezone: "Asia/Ho_Chi_Minh", // Chạy theo múi giờ Việt Nam
    }
  );
};
