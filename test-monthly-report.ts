// test-monthly-report.ts
import * as dotenv from "dotenv";
dotenv.config();

import { connect } from "./src/app/config/db";
import { redisConnection } from "./src/app/config/redis.config";
import {
  monthlyReportQueue,
  IMonthlyReportJobData,
} from "./src/app/queues/MonthlyReport.Queue";
import UserModel from "./src/app/models/User.Model";
import { initializeMonthlyReportWorker } from "./src/app/workers/MonthlyReport.Worker";

async function testMonthlyReport() {
  try {
    // Connect to MongoDB
    await connect();
    console.log("[Test] Connected to MongoDB");

    // Initialize worker
    const worker = initializeMonthlyReportWorker();
    console.log("[Test] Worker initialized");
    // Get a test user
    const testUser = await UserModel.findOne({
      email: "Duoc6694@gmail.com",
    })
      .select("email username")
      .lean();

    if (!testUser) {
      console.log("[Test] No active subscribed user found");
      return;
    }

    console.log(
      `[Test] Found test user: ${testUser.username} (${testUser.email})`
    );

    // Get current month and year
    const now = new Date();
    const testMonth = now.getMonth() + 1; // Current month
    const testYear = now.getFullYear();

    // Create test job
    const jobPayload: IMonthlyReportJobData = {
      userId: testUser._id.toString(),
      email: testUser.email,
      username: testUser.username,
      month: testMonth,
      year: testYear,
    };

    const jobId = `test-monthly-report-${testUser._id}-${Date.now()}`;

    console.log("[Test] Adding job to queue...");
    const job = await monthlyReportQueue.add("sendMonthlyReport", jobPayload, {
      jobId,
      delay: 0, // Execute immediately
    });

    console.log(`[Test] Job added with ID: ${job.id}`);

    // Monitor queue status
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30; // Wait max 30 seconds

    while (!completed && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

      const jobStatus = await job.getState();
      console.log(`[Test] Job status: ${jobStatus}`);

      if (jobStatus === "completed") {
        completed = true;
        console.log("[Test] Job completed successfully!");
        const result = await job.returnvalue;
        console.log("[Test] Job result:", result);
      } else if (jobStatus === "failed") {
        const failedReason = await job.failedReason;
        console.error("[Test] Job failed:", failedReason);
        break;
      }

      attempts++;
    }

    if (!completed && attempts >= maxAttempts) {
      console.log("[Test] Job didn't complete within timeout");
    }

    // Show queue statistics
    const waiting = await monthlyReportQueue.getWaitingCount();
    const active = await monthlyReportQueue.getActiveCount();
    const completedCount = await monthlyReportQueue.getCompletedCount();
    const failed = await monthlyReportQueue.getFailedCount();

    console.log(
      `[Test] Queue stats - Waiting: ${waiting}, Active: ${active}, Completed: ${completedCount}, Failed: ${failed}`
    );
  } catch (error) {
    console.error("[Test] Error:", error);
  } finally {
    // Cleanup
    await redisConnection.quit();
    process.exit(0);
  }
}

// Run the test
testMonthlyReport();
