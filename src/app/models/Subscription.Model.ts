import mongoose, { Schema, model } from "mongoose";

export enum SubscriptionStatus {
  ACTIVE = "active", // Đang hoạt động, người dùng có thể sử dụng dịch vụ
  PENDING_PAYMENT = "pending_payment", // Đang chờ thanh toán (ví dụ: đơn hàng đã tạo nhưng chưa hoàn tất thanh toán)
  GRACE_PERIOD = "grace_period", // Đang trong thời gian gia hạn (ví dụ: thanh toán thất bại, cho người dùng vài ngày để cập nhật)
  EXPIRED = "expired", // Đã hết hạn tự nhiên theo endDate
  CANCELLED_USER = "cancelled_user", // Người dùng tự hủy gói
  CANCELLED_ADMIN = "cancelled_admin", // Admin hủy gói (ví dụ: do vi phạm)
  UPGRADED = "upgraded", // Gói đã được nâng cấp (bản ghi subscription cũ này không còn active)
  DOWNGRADED = "downgraded", // Gói đã bị hạ cấp (bản ghi subscription cũ này không còn active)
  SUPERSEDED = "superseded", // Đã được thay thế bởi một subscription mới (một trạng thái chung cho upgraded/downgraded)
  FAILED_PAYMENT = "failed_payment", // Thanh toán thất bại (có thể chuyển sang grace_period hoặc cancelled)
}

export interface ISubscription {
  userId: Schema.Types.ObjectId;
  packageId: Schema.Types.ObjectId;
  price: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  status: SubscriptionStatus;
  paymentMethod?: string;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    price: { type: Number, default: 0 },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, require: true },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
    },
  },
  {
    timestamps: true,
  }
);

const SubscriptionModel = model<ISubscription>(
  "Subscription",
  subscriptionSchema
);
export default SubscriptionModel;
