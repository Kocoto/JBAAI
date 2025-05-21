import PackageModel from "../models/Package.Model";
import SubscriptionModel, {
  SubscriptionStatus,
} from "../models/Subscription.Model";
import CustomError from "../utils/Error.Util";

import {
  subscriptionLifecycleQueue,
  IExpireSubscriptionPayload,
} from "../queues/SubscriptionLifecycle.Queue";
import UserModel from "../models/User.Model";

class SubscriptionService {
  async getSubscriptionByUserId(userId: string) {
    try {
      const subscription = await SubscriptionModel.findOne({
        userId: userId,
        isActive: true,
      });
      if (!subscription) {
        throw new CustomError(404, "Subscription not found");
      }
      return subscription;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async createSubscription(userId: string, packageId: string) {
    try {
      const [packageData, ivalid] = await Promise.all([
        PackageModel.findById(packageId),
        SubscriptionModel.findOne({ userId: userId }),
      ]);
      if (!packageData) {
        throw new CustomError(404, "Package not found");
      }
      const duration = packageData.duration;
      if (ivalid) {
        const updateSubscription = await SubscriptionModel.findOneAndUpdate(
          { userId: userId },
          {
            packageId: packageId,
            endDate: new Date(
              ivalid.endDate.getTime() + duration * 24 * 60 * 60 * 1000
            ),
            isActive: true,
          },
          { new: true }
        );
        if (!updateSubscription) {
          throw new CustomError(404, "Lỗi khi cập nhật Subscription");
        }
        return updateSubscription;
      }
      const subscription = await SubscriptionModel.create({
        userId: userId,
        packageId: packageId,
        startDate: new Date(),
        endDate: new Date(
          new Date().getTime() + duration * 24 * 60 * 60 * 1000
        ),
        isActive: true,
      });
      if (!subscription) {
        throw new CustomError(404, "Lỗi khi tạo Subscription");
      }
      return subscription;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async handleSuccessfulPaymentAndActivateSubscription(
    userId: string,
    newPackageId: string
  ) {
    try {
      console.log(
        `[SubService] Handling successful payment for user ${userId}, new package ${newPackageId}`
      );
      const newPackageData = await PackageModel.findById(newPackageId);
      if (!newPackageData || typeof newPackageData.duration !== "number") {
        // durationInDays là ví dụ
        throw new CustomError(
          404,
          "Gói dịch vụ mới không tìm thấy hoặc thông tin thời hạn không hợp lệ."
        );
      }

      const durationInMilliseconds =
        newPackageData.duration * 24 * 60 * 60 * 1000;

      const currentActiveSubscription = await SubscriptionModel.findOne({
        userId: userId,
        isActive: true,
      });

      let finalActivatedSubscription;

      if (currentActiveSubscription) {
        console.log(
          `[SubService] Updating existing active subscription for user ${userId}`
        );
        currentActiveSubscription.isActive = false;
        currentActiveSubscription.status = SubscriptionStatus.SUPERSEDED;
        currentActiveSubscription.endDate = new Date();
        await currentActiveSubscription.save();
        console.log(
          `[SubService] Deactivated old subscription ${currentActiveSubscription._id}.`
        );

        const oldJobId = `expire-sub-${currentActiveSubscription._id.toString()}`;
        try {
          const oldJob = await subscriptionLifecycleQueue.getJob(oldJobId);
          if (oldJob) {
            await oldJob.remove();
            console.log(
              `[SubService] Removed old BullMQ job ${oldJobId} for subscription ${currentActiveSubscription._id}.`
            );
          } else {
            console.log(
              `[SubService] No old BullMQ job found with ID ${oldJobId} for old subscription.`
            );
          }
        } catch (error) {
          console.log(
            `[SubService] Error removing old BullMQ job ${oldJobId}: ${error}`
          );
        }
      } else {
        console.log(
          `[SubService] User ${userId} has no active subscription or this is a new subscription.`
        );
      }
      const startDate = new Date();
      const newEndDate = new Date(startDate.getTime() + durationInMilliseconds);

      finalActivatedSubscription = await SubscriptionModel.create({
        userId: userId,
        packageId: newPackageId,
        packageName: newPackageData.name, // Lấy từ packageData
        price: newPackageData.price, // Lấy từ packageData
        startDate: startDate,
        endDate: newEndDate,
        isActive: true,
        status: SubscriptionStatus.ACTIVE,
        // paymentDetails: paymentInfo, // Nếu bạn truyền thông tin thanh toán vào
      });

      if (!finalActivatedSubscription) {
        throw new CustomError(500, "Không thể tạo bản ghi subscription mới.");
      }
      console.log(
        `[SubService] Created new active subscription ${finalActivatedSubscription._id} for user ${userId} until ${finalActivatedSubscription.endDate}.`
      );

      const payload: IExpireSubscriptionPayload = {
        subscriptionId: finalActivatedSubscription._id.toString(),
        userId: finalActivatedSubscription.userId.toString(),
      };
      const delay = finalActivatedSubscription.endDate.getTime() - Date.now();
      const newJobId = `expire-sub-${finalActivatedSubscription._id.toString()}`;

      if (delay >= 0) {
        await subscriptionLifecycleQueue.add(
          "expireSubscriptionTask",
          payload,
          {
            delay: delay,
            jobId: newJobId,
          }
        );
        console.log(
          `[SubService] Scheduled BullMQ job ${newJobId} for new subscription ${finalActivatedSubscription._id}.`
        );
      } else {
        console.warn(
          `[SubService] New subscription ${finalActivatedSubscription._id} has past endDate. Marking as expired.`
        );
        finalActivatedSubscription.isActive = false;
        finalActivatedSubscription.status = SubscriptionStatus.EXPIRED;
        await finalActivatedSubscription.save();
        console.log(
          `[SubService] Marked new subscription ${finalActivatedSubscription._id} as expired.`
        );
      }

      if (
        finalActivatedSubscription.isActive &&
        finalActivatedSubscription.endDate > new Date()
      ) {
        await UserModel.findByIdAndUpdate(userId, {
          isSubscription: true,
          // type: newPackageData.type, // Ví dụ nếu bạn có trường 'type' trên User model
          // currentPackageId: newPackageData._id, // Ví dụ
        });
        console.log(
          `[SubService] User ${userId} status updated: isSubscription = true.`
        );
      } else {
        // Nếu gói mới tạo ra mà hết hạn ngay, kiểm tra xem còn gói nào khác không
        const anyOtherActiveStill = await SubscriptionModel.findOne({
          userId: userId,
          isActive: true,
          endDate: { $gt: new Date() },
        });
        if (!anyOtherActiveStill) {
          await UserModel.findByIdAndUpdate(userId, { isSubscription: false });
          console.log(
            `[SubService] User ${userId} status updated: isSubscription = false (no active subs).`
          );
        }
      }
      return finalActivatedSubscription;
    } catch (error) {
      console.error(
        "[SubService] Error in handleSuccessfulPaymentAndActivateSubscription:",
        error
      );
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        500,
        (error as Error).message || "Lỗi không xác định khi xử lý subscription."
      );
    }
  }
}

export default new SubscriptionService();
