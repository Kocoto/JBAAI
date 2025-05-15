// src/app/queue/Mail.Queue.ts
import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.config";

const EMAIL_QUEUE_NAME = "email-queue";

const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});
console.log(`[Queue] ${EMAIL_QUEUE_NAME} is ready to process jobs`);

export { emailQueue, EMAIL_QUEUE_NAME };
