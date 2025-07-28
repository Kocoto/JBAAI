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
import { ClientSession } from "mongoose";

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
          throw new CustomError(404, "Error updating subscription");
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
        throw new CustomError(404, "Error creating subscription");
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
    newPackageId: string,
    session?: ClientSession
  ) {
    try {
      console.log(
        `[SubService] Handling successful payment for user ${userId}, new package ${newPackageId}`
      );
      const [newPackageData, currentActiveSubscription] = await Promise.all([
        PackageModel.findById(newPackageId).session(session || null),
        SubscriptionModel.findOne({
          userId: userId,
          isActive: true,
        }).session(session || null),
      ]);
      if (!newPackageData || typeof newPackageData.duration !== "number") {
        // durationInDays is an example
        throw new CustomError(
          404,
          "New service package not found or duration information is invalid."
        );
      }

      const durationInMilliseconds =
        newPackageData.duration * 24 * 60 * 60 * 1000;

      let finalActivatedSubscription;

      if (currentActiveSubscription) {
        console.log(
          `[SubService] Updating existing active subscription for user ${userId}`
        );
        currentActiveSubscription.isActive = false;
        currentActiveSubscription.status = SubscriptionStatus.SUPERSEDED;
        currentActiveSubscription.endDate = new Date();
        await currentActiveSubscription.save({ session: session });
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

      finalActivatedSubscription = await SubscriptionModel.create(
        [
          {
            userId: userId,
            packageId: newPackageId,
            packageName: newPackageData.name, // Get from packageData
            price: newPackageData.price, // Get from packageData
            startDate: startDate,
            endDate: newEndDate,
            isActive: true,
            status: SubscriptionStatus.ACTIVE,
            // paymentDetails: paymentInfo, // If you pass payment information in
          },
        ],
        { session }
      );

      if (!finalActivatedSubscription) {
        throw new CustomError(500, "Could not create new subscription record.");
      }
      console.log(
        `[SubService] Created new active subscription ${finalActivatedSubscription[0]._id} for user ${userId} until ${finalActivatedSubscription[0].endDate}.`
      );

      const payload: IExpireSubscriptionPayload = {
        subscriptionId: finalActivatedSubscription[0]._id.toString(),
        userId: finalActivatedSubscription[0].userId.toString(),
      };
      const delay =
        finalActivatedSubscription[0].endDate.getTime() - Date.now();
      const newJobId = `expire-sub-${finalActivatedSubscription[0]._id.toString()}`;

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
          `[SubService] Scheduled BullMQ job ${newJobId} for new subscription ${finalActivatedSubscription[0]._id}.`
        );
      } else {
        console.warn(
          `[SubService] New subscription ${finalActivatedSubscription[0]._id} has past endDate. Marking as expired.`
        );
        finalActivatedSubscription[0].isActive = false;
        finalActivatedSubscription[0].status = SubscriptionStatus.EXPIRED;
        await finalActivatedSubscription[0].save({ session: session });
        console.log(
          `[SubService] Marked new subscription ${finalActivatedSubscription[0]._id} as expired.`
        );
      }

      if (
        finalActivatedSubscription[0].isActive &&
        finalActivatedSubscription[0].endDate > new Date()
      ) {
        await UserModel.findByIdAndUpdate(
          userId,
          {
            isSubscription: true,
            type: newPackageData.type, // Example if you have a 'type' field on the User model
            // currentPackageId: newPackageData._id, // Example
          },
          { session: session }
        );
        console.log(
          `[SubService] User ${userId} status updated: isSubscription = true.`
        );
      } else {
        // If the newly created package expires immediately, check if there are any other active packages
        const anyOtherActiveStill = await SubscriptionModel.findOne({
          userId: userId,
          isActive: true,
          endDate: { $gt: new Date() },
        }).session(session || null);
        if (!anyOtherActiveStill) {
          await UserModel.findByIdAndUpdate(userId, {
            isSubscription: false,
          }).session(session || null);
          console.log(
            `[SubService] User ${userId} status updated: isSubscription = false (no active subs).`
          );
        }
      }
      return finalActivatedSubscription[0];
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
        (error as Error).message || "Unknown error when processing subscription."
      );
    }
  }
}

export default new SubscriptionService();
