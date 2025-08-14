import * as dotenv from "dotenv";
dotenv.config();

import { connect } from "../app/config/db";
import { redisConnection } from "../app/config/redis.config";
import {
  subscriptionLifecycleQueue,
  SubscriptionJobName,
} from "../app/queues/SubscriptionLifecycle.Queue";
import UserModel from "../app/models/User.Model";
import SubscriptionModel, {
  SubscriptionStatus,
} from "../app/models/Subscription.Model";
import PackageModel from "../app/models/Package.Model";
import { initializeSubscriptionLifecycleWorker } from "../app/workers/SubscriptionLifecycle.Worker";

(async () => {
  try {
    // Connect to MongoDB
    await connect();
    console.log("[TestSubscription] Connected to MongoDB");

    // Initialize worker
    const worker = initializeSubscriptionLifecycleWorker();
    console.log("[TestSubscription] Worker initialized");

    // Get or create a test user
    let testUser = await UserModel.findOne({ email: "baochien2602@gmail.com" });
    if (!testUser) {
      testUser = await UserModel.create({
        username: "testuser",
        password: "testpassword",
        email: "baochien2602@gmail.com",
        phone: "0123456789",
        role: "user",
        status: "active",
        verify: true,
        language: "vn",
        discount: false,
        isSubscription: true,
        emailNotificationsEnabled: true,
        isPayment: true,
        isHideScore: false,
        type: "standard",
        typeLogin: { type: "email", id: "testuser" },
        isDeleted: false,
        deletedAt: null,
        isHideGLB1: false,
      });
      console.log("[TestSubscription] Created test user");
    }

    // Get or create a test package
    let pkg = await PackageModel.findOne({ name: "Gói test" });
    if (!pkg) {
      pkg = await PackageModel.create({
        userId: testUser._id,
        name: "Gói test",
        description: "Gói test cho subscription",
        price: 100000,
        duration: 7, // 7 ngày
        currency: "VND",
        status: true,
        type: "standard",
        location: "other",
      });
      console.log("[TestSubscription] Created test package");
    }

    // Tạo subscription mẫu với endDate là 50 giây sau
    const now = new Date();
    const endDate = new Date(now.getTime() + 60 * 1000);
    let subscription = await SubscriptionModel.findOne({
      userId: testUser._id,
      status: SubscriptionStatus.ACTIVE,
    });
    if (!subscription) {
      subscription = await SubscriptionModel.create({
        userId: testUser._id,
        packageId: pkg._id,
        price: pkg.price,
        startDate: now,
        endDate: endDate,
        isActive: true,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: "test",
      });
      console.log(
        `[TestSubscription] Created test subscription: ${subscription._id}`
      );
    }

    console.log(
      `[TestSubscription] Found subscription: ${
        subscription._id
      } (Ends: ${subscription.endDate.toLocaleTimeString()})`
    );

    // Lên lịch các job test nhanh
    const notifyJobs = [
      { name: SubscriptionJobName.NOTIFY_3_DAYS, secondsBefore: 40 },
      { name: SubscriptionJobName.NOTIFY_2_DAYS, secondsBefore: 30 },
      { name: SubscriptionJobName.NOTIFY_1_DAY, secondsBefore: 20 },
      { name: SubscriptionJobName.NOTIFY_TODAY, secondsBefore: 10 },
      { name: SubscriptionJobName.EXPIRE, secondsBefore: 0, isExpire: true },
    ];

    for (const job of notifyJobs) {
      let jobTime;
      if (job.isExpire) {
        jobTime = endDate;
      } else {
        jobTime = new Date(endDate.getTime() - job.secondsBefore * 1000);
      }
      const delay = jobTime.getTime() - now.getTime();
      if (delay > 0) {
        await subscriptionLifecycleQueue.add(
          job.name,
          {
            subscriptionId: subscription._id,
            userId: testUser._id,
          },
          {
            delay,
          }
        );
        console.log(
          `[TestSubscription] Đã lên lịch job ${job.name} sau ${Math.round(
            delay / 1000
          )}`
        );
      } else {
        console.log(`Bỏ qua job ${job.name} vì thời điểm đã qua`);
      }
    }

    console.log("[TestSubscription] Các job thực tế đã được lên lịch!");
  } catch (error) {
    console.error("[TestSubscription] Error:", error);
  } finally {
    await redisConnection.quit();
    process.exit(0);
  }
})();
