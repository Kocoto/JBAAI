import mongoose, { Schema, model } from "mongoose";

export interface IPurchaseHistoryInput {
  userId: string;
  packageId: string;
  price: number;
  purchaseDate: Date;
  transactionId: string;
  paymentMethod: string;
  status: "success" | "failed" | "pending" | "refunded";
}
export interface IPurchaseHistory {
  userId: Schema.Types.ObjectId;
  packageId: Schema.Types.ObjectId;
  price: number;
  purchaseDate: Date;
  transactionId: string;
  paymentMethod: string;
  status: "success" | "failed" | "pending" | "refunded";
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
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["success", "failed", "pending", "refunded"],
  },
});

const PurchaseHistoryModel = model<IPurchaseHistory>(
  "PurchaseHistory",
  purchaseHistorySchema
);

export default PurchaseHistoryModel;
