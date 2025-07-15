import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.config";

export const MONTHLY_REPORT_QUEUE_NAME = "monthly-report-queue";

export interface IMonthlyReportJobData {
  userId: string;
  email: string;
  username: string;
  year: number;
  month: number;
}

const monthlyReportQueue = new Queue(MONTHLY_REPORT_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Thử lại 3 lần nếu có lỗi
    backoff: {
      type: "exponential",
      delay: 10000, // Thử lại sau 10s, 20s, 40s
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});

console.log(`[Queue] ${MONTHLY_REPORT_QUEUE_NAME} is ready to process jobs`);

export { monthlyReportQueue };
