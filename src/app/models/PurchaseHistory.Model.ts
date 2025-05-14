import mongoose, { Schema, model } from "mongoose";

export interface IPurchaseHistoryInput {
  userId: string;
  packageId: string;
  price: number;
  purchaseDate: Date;
  transactionId: string;
  paymentMethod: string;
  type: "premium" | "standard";
  status: "success" | "failed" | "pending" | "refunded";
  discount: number;
}
export interface IPurchaseHistory {
  userId: Schema.Types.ObjectId;
  packageId: Schema.Types.ObjectId;
  price: number;
  purchaseDate: Date;
  transactionId: string;
  paymentMethod: string;
  status: string;
  type: "premium" | "standard";
  discount: number;
}

const purchaseHistorySchema = new Schema<IPurchaseHistory>({
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
  price: {
    type: Number,
    required: true,
  },
  purchaseDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  transactionId: {
    type: String,
    required: true,
    index: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["success", "failed", "pending", "refunded"],
    required: true,
  },
  type: {
    type: String,
    enum: ["premium", "standard"],
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
});

const PurchaseHistoryModel = model<IPurchaseHistory>(
  "PurchaseHistory",
  purchaseHistorySchema
);

export default PurchaseHistoryModel;
