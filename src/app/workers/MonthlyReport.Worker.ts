import { Worker, Job } from "bullmq";
import {
  MONTHLY_REPORT_QUEUE_NAME,
  IMonthlyReportJobData,
} from "../queues/MonthlyReport.Queue";
import { redisConnection } from "../config/redis.config";
import HealthDataService from "../services/HealthData.Service";
import { exportHealthReportExcel } from "../utils/HealthReport.Util";
import { sendMail } from "../utils/Mail.Util";

console.log(
  `[Worker] Khởi tạo worker quản lý báo cáo hàng đợi: ${MONTHLY_REPORT_QUEUE_NAME}`
);

export const processMonthlyReportJob = async (
  job: Job<IMonthlyReportJobData>
) => {
  console.log(`[Worker] Đang xử lý công việc báo cáo tháng: ${job.id}`);
  console.log(`[Worker] Tên công việc: ${JSON.stringify(job.name)}`);

  try {
    const { userId, email, username, year, month } = job.data;
    const healthData =
      await HealthDataService.getMonthlyHealthReportDataForExcel(
        userId,
        year,
        month
      );

    const totalScans = healthData.length;
    const excelBuffer = await exportHealthReportExcel({
      month,
      year,
      healthData,
      totalScans,
    });
    const fileName = ``;

    const mailOptions = {
      from: "JBA AI",
      to: email,
      subject: `Báo cáo sức khỏe tháng ${month}/${year} của bạn`,
      html: `
        <p>Xin chào ${username},</p>
        <p>JBAAI gửi bạn báo cáo phân tích các chỉ số sức khỏe trong tháng ${month}/${year}.</p>
        <p>Vui lòng xem chi tiết trong file Excel đính kèm.</p>
        <p>Chúc bạn luôn khỏe mạnh!</p>
        <p>Trân trọng,<br/>Đội ngũ JBAAI</p>
      `,
      attachments: [
        {
          filename: fileName,
          content: excelBuffer,
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    };

    await sendMail(mailOptions);
    console.log(`[Worker] Successfully sent monthly report to ${email}`);
  } catch (error) {
    console.error(
      `[Worker] Failed to process job ${job.id} for user ${job.data.userId}. Error:`,
      error
    );
    // Ném lỗi để BullMQ có thể thử lại job
    throw error;
  }
};
export const initializeMonthlyReportWorker = (): Worker => {
  const worker = new Worker<IMonthlyReportJobData>(
    MONTHLY_REPORT_QUEUE_NAME,
    processMonthlyReportJob,
    {
      connection: redisConnection,
      concurrency: 5, // Xử lý 5 job đồng thời, có thể điều chỉnh
    }
  );

  worker.on("completed", (job: Job) => {
    console.log(`[Worker Event] Job ${job.id} has completed.`);
  });

  worker.on("failed", (job: Job | undefined, error: Error) => {
    if (job) {
      console.error(
        `[Worker Event] Job ${job.id} failed with error: ${error.message}`
      );
    }
  });

  return worker;
};
