import { Worker, Job } from "bullmq";
import { SUBSCRIPTION_LIFECYCLE_QUEUE_NAME } from "../queues/SubscriptionLifecycle.Queue";
import { redisConnection } from "../config/redis.config";
import { IExpireSubscriptionPayload } from "../queues/SubscriptionLifecycle.Queue";
import SubscriptionModel, {
  SubscriptionStatus,
} from "../models/Subscription.Model";
import UserModel from "../models/User.Model";

console.log(
  `[Worker] Stating subscription lifecycle worker for queue: ${SUBSCRIPTION_LIFECYCLE_QUEUE_NAME}`
);

export const processSubscriptionLifecycleJob = async (
  job: Job<IExpireSubscriptionPayload>
) => {
  console.log(`[Worker] Processing subscription lifecycle job: ${job.id}`);
  console.log(`[Worker] Job name: ${JSON.stringify(job.name)}`);

  switch (job.name) {
    case "expireSubscriptionTask":
      const expireSubscriptionPayload = job.data as IExpireSubscriptionPayload;
      const { subscriptionId, userId } = job.data;
      if (!subscriptionId || !userId) {
        console.error(
          `[SubWorker] Job ${job.id} is missing subscriptionId or userId in payload.`
        );
        // Ném lỗi để job này được coi là thất bại và không thử lại (nếu payload hỏng)
        // Hoặc bạn có thể chỉ log và để job tự hoàn thành mà không làm gì
        throw new Error("Missing subscriptionId or userId in job payload.");
      }
      try {
        console.log(
          `[SubWorker] Attempting to expire subscription ${subscriptionId} for user ${userId}.`
        );

        const subscription = await SubscriptionModel.findById(subscriptionId);

        if (!subscription) {
          console.error(
            `[SubWorker] Subscription ${subscriptionId} not found for user ${userId}.`
          );
          // Ném lỗi để job này được coi là thất bại và không thử lại (nếu subscription không tồn tại)
          return;
        }
        // Kiểm tra 1: Subscription có còn active không? Nếu đã bị hủy/nâng cấp trước đó thì không cần xử lý hết hạn nữa.
        if (
          !subscription.isActive ||
          subscription.status !== SubscriptionStatus.ACTIVE
        ) {
          console.log(
            `[SubWorker] Subscription ${subscriptionId} is no longer active (current status: ${subscription.status}). Expiration task skipped.`
          );
          return;
        }

        // Kiểm tra 2: Ngày hết hạn đã thực sự đến chưa?
        // Mặc dù BullMQ lên lịch job theo delay, vẫn nên có kiểm tra này để đảm bảo.
        // Có thể có sai số nhỏ về thời gian, hoặc job được chạy lại.
        const now = new Date();
        if (subscription.endDate > now) {
          // Nếu ngày hết hạn vẫn còn trong tương lai một cách đáng kể (ví dụ > vài phút)
          // Điều này không nên xảy ra nếu job được lên lịch đúng.
          // Có thể là job bị kích hoạt sớm do lỗi nào đó.
          console.warn(
            `[SubWorker] Job ${job.id} for subscription ${subscriptionId} executed prematurely. Subscription endDate (${subscription.endDate}) is still in the future. Re-queueing with corrected delay or failing for review.`
          );
          // Tùy chọn:
          // 1. Ném lỗi để BullMQ thử lại sau (nếu bạn nghĩ đây là lỗi tạm thời).
          throw new Error(
            `Job executed prematurely. Subscription endDate is ${subscription.endDate}`
          );
        }

        // Nếu tất cả điều kiện đều ổn, tiến hành cập nhật
        console.log(
          `[SubWorker] Expiring subscription ${subscriptionId}. Current endDate: ${subscription.endDate}.`
        );
        subscription.isActive = false;
        subscription.status = SubscriptionStatus.EXPIRED;
        // Không cần thay đổi endDate, vì nó đã là ngày hết hạn.
        await subscription.save();
        console.log(
          `[SubWorker] Subscription ${subscriptionId} status updated to EXPIRED and isActive = false.`
        );

        // Cập nhật trạng thái isSubscription của User
        // Chỉ cập nhật isSubscription của User thành false NẾU họ không còn bất kỳ subscription nào khác đang active
        const otherActiveSubscriptions = await SubscriptionModel.findOne({
          userId: userId,
          isActive: true,
          // status: SubscriptionStatus.ACTIVE, // Nếu bạn dùng status
          endDate: { $gt: new Date() }, // Đảm bảo endDate thực sự trong tương lai
        });

        if (!otherActiveSubscriptions) {
          await UserModel.findByIdAndUpdate(userId, {
            $set: { isSubscription: false },
          });
          console.log(
            `[SubWorker] User ${userId} 'isSubscription' status updated to false.`
          );
        } else {
          console.log(
            `[SubWorker] User ${userId} still has other active subscriptions. 'isSubscription' status not changed.`
          );
        }

        console.log(
          `[SubWorker] Successfully processed expiration for subscription ${subscriptionId}.`
        );
      } catch (error: any) {
        console.error(
          `[SubWorker] Error processing 'expireSubscriptionTask' for job ${job.id} (Subscription: ${subscriptionId}):`,
          error
        );
        // Ném lỗi để BullMQ có thể thử lại job này dựa trên cấu hình `attempts` và `backoff`
        throw error;
      }
    default:
      console.warn(
        `[SubWorker] Received job with unknown name: ${job.name} (ID: ${job.id}).`
      );
      throw new Error(`Unknown job name: ${job.name}`); // Ném lỗi để job này được đánh dấu là thất bại
  }
};

export const initializeSubscriptionLifecycleWorker =
  (): Worker<IExpireSubscriptionPayload> => {
    console.log(
      `[SubWorker Initializer] Initializing worker for queue: ${SUBSCRIPTION_LIFECYCLE_QUEUE_NAME}...`
    );

    const workerInstance = new Worker<IExpireSubscriptionPayload>(
      SUBSCRIPTION_LIFECYCLE_QUEUE_NAME,
      processSubscriptionLifecycleJob, // Hàm xử lý job đã định nghĩa ở trên
      {
        connection: redisConnection, // Thông tin kết nối Redis
        concurrency: 5, // Số lượng job xử lý đồng thời (điều chỉnh tùy theo tài nguyên)
        // removeOnComplete: { count: 1000, age: 24 * 60 * 60 }, // Có thể ghi đè defaultJobOptions của Queue nếu muốn
        // removeOnFail: { count: 5000 },
      }
    );

    // Lắng nghe các sự kiện của worker (rất hữu ích để theo dõi và gỡ lỗi)
    workerInstance.on(
      "failed",
      (job: Job<IExpireSubscriptionPayload> | undefined, error: Error) => {
        if (job) {
          console.error(
            `[SubWorker Event] Job ${job.id} (Name: ${job.name}) failed after ${
              job.attemptsMade
            } attempts with error: ${error.message}. Data: ${JSON.stringify(
              job.data
            )}`
          );
        } else {
          console.error(
            `[SubWorker Event] An unspecified job in ${SUBSCRIPTION_LIFECYCLE_QUEUE_NAME} failed with error: ${error.message}`
          );
        }
      }
    );

    workerInstance.on("error", (error: Error) => {
      console.error(
        `[SubWorker Event] Worker for ${SUBSCRIPTION_LIFECYCLE_QUEUE_NAME} encountered an error:`,
        error
      );
    });

    workerInstance.on("completed", (job: Job<IExpireSubscriptionPayload>) => {
      console.log(
        `[SubWorker Event] Job ${job.id} (Name: ${
          job.name
        }) has completed successfully. Data: ${JSON.stringify(job.data)}`
      );
    });

    workerInstance.on("active", (job: Job<IExpireSubscriptionPayload>) => {
      console.log(
        `[SubWorker Event] Job ${job.id} (Name: ${
          job.name
        }) has started processing. Data: ${JSON.stringify(job.data)}`
      );
    });

    console.log(
      `[SubWorker Initializer] Subscription Lifecycle Worker for queue '${SUBSCRIPTION_LIFECYCLE_QUEUE_NAME}' initialized and waiting for jobs.`
    );
    return workerInstance;
  };
