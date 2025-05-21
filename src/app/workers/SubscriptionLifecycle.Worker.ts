import { Worker, Job } from "bullmq";
import { SUBSCRIPTION_LIFECYCLE_QUEUE_NAME } from "../queues/SubscriptionLifecycle.Queue";
import { redisConnection } from "../config/redis.config";
import { IExpireSubscriptionPayload } from "../queues/SubscriptionLifecycle.Queue";
import SubscriptionModel, {
  SubscriptionStatus,
} from "../models/Subscription.Model";
import UserModel from "../models/User.Model";

console.log(
  `[Worker] Khởi tạo worker quản lý vòng đời subscription cho hàng đợi: ${SUBSCRIPTION_LIFECYCLE_QUEUE_NAME}`
);

export const processSubscriptionLifecycleJob = async (
  job: Job<IExpireSubscriptionPayload>
) => {
  console.log(
    `[Worker] Đang xử lý công việc quản lý vòng đời subscription: ${job.id}`
  );
  console.log(`[Worker] Tên công việc: ${JSON.stringify(job.name)}`);

  switch (job.name) {
    case "expireSubscriptionTask":
      const expireSubscriptionPayload = job.data as IExpireSubscriptionPayload;
      const { subscriptionId, userId } = job.data;
      if (!subscriptionId || !userId) {
        console.error(
          `[SubWorker] Công việc ${job.id} thiếu subscriptionId hoặc userId trong payload.`
        );
        // Ném lỗi để job này được coi là thất bại và không thử lại (nếu payload hỏng)
        // Hoặc bạn có thể chỉ log và để job tự hoàn thành mà không làm gì
        throw new Error(
          "Thiếu subscriptionId hoặc userId trong payload công việc."
        );
      }
      try {
        console.log(
          `[SubWorker] Đang cố gắng hết hạn subscription ${subscriptionId} cho người dùng ${userId}.`
        );

        const subscription = await SubscriptionModel.findById(subscriptionId);

        if (!subscription) {
          console.error(
            `[SubWorker] Không tìm thấy subscription ${subscriptionId} cho người dùng ${userId}.`
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
            `[SubWorker] Subscription ${subscriptionId} không còn hoạt động (trạng thái hiện tại: ${subscription.status}). Bỏ qua nhiệm vụ hết hạn.`
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
            `[SubWorker] Công việc ${job.id} cho subscription ${subscriptionId} được thực thi quá sớm. Ngày hết hạn subscription (${subscription.endDate}) vẫn còn trong tương lai. Đang xếp lại hàng đợi với độ trễ đã điều chỉnh hoặc đánh dấu thất bại để xem xét.`
          );
          // Tùy chọn:
          // 1. Ném lỗi để BullMQ thử lại sau (nếu bạn nghĩ đây là lỗi tạm thời).
          throw new Error(
            `Công việc được thực thi quá sớm. Ngày hết hạn subscription là ${subscription.endDate}`
          );
        }

        // Nếu tất cả điều kiện đều ổn, tiến hành cập nhật
        console.log(
          `[SubWorker] Đang hết hạn subscription ${subscriptionId}. Ngày hết hạn hiện tại: ${subscription.endDate}.`
        );
        subscription.isActive = false;
        subscription.status = SubscriptionStatus.EXPIRED;
        // Không cần thay đổi endDate, vì nó đã là ngày hết hạn.
        await subscription.save();
        console.log(
          `[SubWorker] Subscription ${subscriptionId} đã được cập nhật trạng thái thành HẾT HẠN và isActive = false.`
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
            `[SubWorker] Trạng thái 'isSubscription' của người dùng ${userId} đã được cập nhật thành false.`
          );
        } else {
          console.log(
            `[SubWorker] Người dùng ${userId} vẫn còn các subscription khác đang hoạt động. Không thay đổi trạng thái 'isSubscription'.`
          );
        }

        console.log(
          `[SubWorker] Đã xử lý thành công việc hết hạn cho subscription ${subscriptionId}.`
        );
      } catch (error: any) {
        console.error(
          `[SubWorker] Lỗi khi xử lý 'expireSubscriptionTask' cho công việc ${job.id} (Subscription: ${subscriptionId}):`,
          error
        );
        // Ném lỗi để BullMQ có thể thử lại job này dựa trên cấu hình `attempts` và `backoff`
        throw error;
      }
      break;
    default:
      console.warn(
        `[SubWorker] Nhận được công việc với tên không xác định: ${job.name} (ID: ${job.id}).`
      );
      throw new Error(`Tên công việc không xác định: ${job.name}`); // Ném lỗi để job này được đánh dấu là thất bại
  }
};

export const initializeSubscriptionLifecycleWorker =
  (): Worker<IExpireSubscriptionPayload> => {
    console.log(
      `[SubWorker Initializer] Đang khởi tạo worker cho hàng đợi: ${SUBSCRIPTION_LIFECYCLE_QUEUE_NAME}...`
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
            `[SubWorker Event] Công việc ${job.id} (Tên: ${
              job.name
            }) thất bại sau ${job.attemptsMade} lần thử với lỗi: ${
              error.message
            }. Dữ liệu: ${JSON.stringify(job.data)}`
          );
        } else {
          console.error(
            `[SubWorker Event] Một công việc không xác định trong ${SUBSCRIPTION_LIFECYCLE_QUEUE_NAME} đã thất bại với lỗi: ${error.message}`
          );
        }
      }
    );

    workerInstance.on("error", (error: Error) => {
      console.error(
        `[SubWorker Event] Worker cho ${SUBSCRIPTION_LIFECYCLE_QUEUE_NAME} gặp lỗi:`,
        error
      );
    });

    workerInstance.on("completed", (job: Job<IExpireSubscriptionPayload>) => {
      console.log(
        `[SubWorker Event] Công việc ${job.id} (Tên: ${
          job.name
        }) đã hoàn thành thành công. Dữ liệu: ${JSON.stringify(job.data)}`
      );
    });

    workerInstance.on("active", (job: Job<IExpireSubscriptionPayload>) => {
      console.log(
        `[SubWorker Event] Công việc ${job.id} (Tên: ${
          job.name
        }) đã bắt đầu xử lý. Dữ liệu: ${JSON.stringify(job.data)}`
      );
    });

    console.log(
      `[SubWorker Initializer] Worker Quản lý Vòng đời Subscription cho hàng đợi '${SUBSCRIPTION_LIFECYCLE_QUEUE_NAME}' đã được khởi tạo và đang chờ công việc.`
    );
    return workerInstance;
  };
