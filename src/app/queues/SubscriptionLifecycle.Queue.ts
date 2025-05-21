import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.config";

export interface IExpireSubscriptionPayload {
  subscriptionId: string;
  userId: string;
}
const SUBSCRIPTION_LIFECYCLE_QUEUE_NAME = "subscription-lifecycle-queue";

const subscriptionLifecycleQueue = new Queue(
  SUBSCRIPTION_LIFECYCLE_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: {
        count: 1000,
      },
      removeOnFail: {
        count: 5000,
      },
    },
  }
);
subscriptionLifecycleQueue.on("error", (error) => {
  console.error(
    `[Queue] Error in subscription lifecycle queue: ${error.message}`,
    error
  );
});

console.log("[Queue] Initialized subscription lifecycle queue");
export { subscriptionLifecycleQueue, SUBSCRIPTION_LIFECYCLE_QUEUE_NAME };
