import PackageModel from "../models/Package.Model";
import SubscriptionModel from "../models/Subscription.Model";
import CustomError from "../utils/Error.Util";

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
}

export default new SubscriptionService();
