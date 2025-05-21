// src/app/workers/email.worker.ts
import { Worker, Job } from "bullmq";
import { EMAIL_QUEUE_NAME } from "../queues/Mail.Queue"; // 1. Import tên queue
import { redisConnection } from "../config/redis.config"; // 2. Import cấu hình Redis
import { IHealthDataEmailJobPayload } from "../services/HealthData.Service"; // 3. Import interface payload (quan trọng!)
import { renderEmailTemplate, sendMail } from "../utils/Mail.Util"; // 4. Import các hàm tiện ích cần thiết
import * as path from "path"; // 5. Import path để xử lý đường dẫn attachment
import CustomError from "../utils/Error.Util";

console.log(`[Worker] Starting email worker for queue: ${EMAIL_QUEUE_NAME}...`);

export const processEmailJob = async (
  job: Job<IHealthDataEmailJobPayload, any, string>
) => {
  console.log(`[Worker] Processing email job: ${job.id}`);
  console.log(`[Worker] Job name: ${JSON.stringify(job.name)}`);

  switch (job.name) {
    case "sendHealthReportEmail":
      const healthDataPayload = job.data as IHealthDataEmailJobPayload;
      try {
        console.log("[Worker] rebdering email template...");
        const htmlContent = await renderEmailTemplate(
          healthDataPayload.language,
          healthDataPayload.targetUsername,
          healthDataPayload.healthReportData,
          healthDataPayload.type,
          "Đây là chart của bạn"
        );

        console.log(
          `[Worker] Preparing mail options for ${healthDataPayload.emailTo}...`
        );
        const mailOptions = {
          from: "JBA AI",
          to: healthDataPayload.emailTo,
          subject: "Health Data",
          html: htmlContent,
          attachments: [
            {
              filename: "logo-JBAAI-2.png",
              path: path.join(
                __dirname,
                "..",
                "..",
                "..",
                "templates",
                "logo",
                "logo-JBAAI-2.png"
              ),
              cid: "logo-JBAAI-2.png", //same cid value as in the html img src
            },
          ],
        };

        console.log(
          `[Worker] Sending email to ${healthDataPayload.emailTo}...`
        );

        await sendMail(mailOptions);
        console.log(`[Worker] Email sent successfully`);
      } catch (error) {
        console.error(
          `[Worker] Error processing job ${job.id} (sendHealthReportEmail) for ${healthDataPayload.emailTo}:`,
          error
        );
        // 12. Ném lỗi để BullMQ biết job thất bại và có thể thử lại
        throw error;
      }
      break;

    default:
      console.warn(
        `[Worker email] Received job with unknown name: ${job.name}. Skipping.`
      );
      // Bạn có thể quyết định ném lỗi hoặc bỏ qua job này
      throw new Error(`Unknown job name: ${job.name}`);
  }
};

export const initializeEmailWorker = (): Worker => {
  console.log(
    `[Worker Initializer] Initializing email worker for queue: ${EMAIL_QUEUE_NAME}...`
  );

  const workerInstance = new Worker(
    EMAIL_QUEUE_NAME,
    processEmailJob, // Sử dụng hàm xử lý job đã định nghĩa ở trên
    {
      connection: redisConnection,
      concurrency: 5, // Điều chỉnh concurrency nếu cần
    }
  );

  // Lắng nghe các sự kiện của worker (quan trọng)
  workerInstance.on("failed", (job: Job | undefined, error: Error) => {
    if (job) {
      console.error(
        `[Worker Event - Initialized] Job ${job.id} (Name: ${job.name}) failed after ${job.attemptsMade} attempts with error: ${error.message}`
      );
    } else {
      console.error(
        `[Worker Event - Initialized] An unspecified job failed with error: ${error.message}`
      );
    }
  });

  workerInstance.on("error", (error: Error) => {
    console.error(
      "[Worker Event - Initialized] Worker encountered an error:",
      error
    );
  });

  workerInstance.on("completed", (job: Job) => {
    console.log(
      `[Worker Event - Initialized] Job ${job.id} (Name: ${job.name}) has completed successfully.`
    );
  });

  workerInstance.on("active", (job: Job) => {
    console.log(
      `[Worker Event - Initialized] Job ${job.id} (Name: ${job.name}) has started processing.`
    );
  });

  console.log(
    "[Worker Initializer] Email worker initialized and waiting for jobs."
  );
  return workerInstance; // Trả về instance của worker nếu bạn muốn tương tác thêm từ bên ngoài
};
