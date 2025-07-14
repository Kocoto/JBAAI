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
  `[Worker] Initializing monthly report queue worker: ${MONTHLY_REPORT_QUEUE_NAME}`
);

export const processMonthlyReportJob = async (
  job: Job<IMonthlyReportJobData>
) => {
  console.log(`[Worker] Processing monthly report job: ${job.id}`);
  console.log(`[Worker] Job name: ${JSON.stringify(job.name)}`);

  try {
    const { userId, email, username, year, month } = job.data;
    const yearNumber = Number(year);
    const monthNumber = Number(month);
    const healthData =
      await HealthDataService.getMonthlyHealthReportDataForExcel(
        userId,
        monthNumber,
        yearNumber
      );

    const totalScans = healthData.length;
    const excelBuffer = await exportHealthReportExcel({
      month: monthNumber,
      year: yearNumber,
      healthData,
      totalScans,
    });
    const fileName = `HealthReport_${username}_Month${month}_${year}.xlsx`;

    const mailOptions = {
      from: "JBA AI",
      to: email,
      subject: `Your Health Report for ${month}/${year}`,
      html: `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Health Report for ${month}/${year}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f7fa;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f7fa; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px 40px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">JBA AI</h1>
                            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Your Health Companion</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <!-- Greeting -->
                            <h2 style="color: #2d3748; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                                Hello ${username}! 👋
                            </h2>
                            
                            <!-- Main message -->
                            <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 0 0 30px 0; border-radius: 0 8px 8px 0;">
                                <p style="color: #4a5568; margin: 0; line-height: 1.6; font-size: 16px;">
                                    We are pleased to send you your <strong>Health Analysis Report</strong> for <strong style="color: #667eea;">${month}/${year}</strong>.
                                </p>
                            </div>
                            
                            <!-- Info Box -->
                            <div style="background-color: #edf2f7; padding: 25px; border-radius: 8px; margin: 0 0 30px 0;">
                                <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                                    📊 Report Contents
                                </h3>
                                <ul style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
                                    <li>Overview of health indicators</li>
                                    <li>Trend and variation analysis</li>
                                    <li>Assessment and recommendations</li>
                                    <li>Comparison with previous months</li>
                                </ul>
                            </div>
                            
                            <!-- CTA -->
                            <div style="text-align: center; margin: 30px 0;">
                                <div style="display: inline-block; background-color: #667eea; padding: 14px 30px; border-radius: 8px;">
                                    <span style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
                                        📎 Excel file attached below
                                    </span>
                                </div>
                            </div>
                            
                            <!-- Additional message -->
                            <div style="background-color: #f0fff4; border: 1px solid #9ae6b4; padding: 20px; border-radius: 8px; margin: 30px 0;">
                                <p style="color: #22543d; margin: 0; line-height: 1.6; text-align: center;">
                                    <strong>💚 Advice:</strong> Maintain a healthy lifestyle and monitor your health regularly for a better life!
                                </p>
                            </div>
                            
                            <!-- Closing -->
                            <p style="color: #4a5568; line-height: 1.6; margin: 30px 0 10px 0;">
                                Thank you for trusting and using our services. If you have any questions, please don't hesitate to contact us.
                            </p>
                            
                            <p style="color: #4a5568; line-height: 1.6; margin: 0;">
                                Wishing you abundant health! 🌟
                            </p>
                            
                            <!-- Signature -->
                            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                                <p style="color: #2d3748; margin: 0; font-weight: 600;">Best regards,</p>
                                <p style="color: #667eea; margin: 5px 0; font-size: 18px; font-weight: 700;">JBA AI Team</p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #2d3748; padding: 30px 40px; text-align: center;">
                            <p style="color: #a0aec0; margin: 0 0 10px 0; font-size: 14px;">
                                © 2024 JBA AI. All rights reserved.
                            </p>
                            <p style="color: #718096; margin: 0; font-size: 12px; line-height: 1.6;">
                                This email is sent automatically. Please do not reply directly to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
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
    // Throw error so BullMQ can retry the job
    throw error;
  }
};
export const initializeMonthlyReportWorker = (): Worker => {
  const worker = new Worker<IMonthlyReportJobData>(
    MONTHLY_REPORT_QUEUE_NAME,
    processMonthlyReportJob,
    {
      connection: redisConnection,
      concurrency: 5, // Process 5 jobs concurrently, can be adjusted
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
