import mongoose, { Schema, model } from "mongoose";

interface ISubscription {
  userId: Schema.Types.ObjectId;
  packageId: Schema.Types.ObjectId;
  price: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

const subscriptionSchema = new Schema<ISubscription>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    indexes: true,
  },
  packageId: {
    type: Schema.Types.ObjectId,
    ref: "Package",
    required: true,
  },
  price: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  isActive: { type: Boolean, default: false },
});

const SubscriptionModel = model<ISubscription>(
  "Subscription",
  subscriptionSchema
);
export default SubscriptionModel;
