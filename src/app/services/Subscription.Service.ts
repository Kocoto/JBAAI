import PackageModel from "../models/Package.Model";
import SubscriptionModel, {
  SubscriptionStatus,
} from "../models/Subscription.Model";
import CustomError from "../utils/Error.Util";

import {
  subscriptionLifecycleQueue,
  IExpireSubscriptionPayload,
} from "../queues/SubscriptionLifecycle.Queue";

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

      const currentAcctiveSubscription = await SubscriptionModel.findOne({
        userId: userId,
        isActive: true,
      });

      let finalActivatedSubscription;

      if (currentAcctiveSubscription) {
        console.log(
          `[SubService] Updating existing active subscription for user ${userId}`
        );
        currentAcctiveSubscription.isActive = false;
        currentAcctiveSubscription.status = SubscriptionStatus.SUPERSEDED;
        currentAcctiveSubscription.endDate = new Date();
        await currentAcctiveSubscription.save();
      }
    } catch (error) {}
  }
}

export default new SubscriptionService();
