import mongoose, { Schema } from "mongoose";

interface IUpgradeRequest {
  userId: mongoose.Types.ObjectId;
  salerId: mongoose.Types.ObjectId;
  phone: string;
  email: string;
  fullname: string;
  address: string;
  role: "spa" | "doctor" | "pharmacy" | "school" | "hospital";
  status: "pending" | "approved" | "rejected" | "reviewing";
}

const UpgradeRequestSchema = new Schema<IUpgradeRequest>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    salerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    fullname: { type: String, required: true },
    role: { type: String, required: true },
    address: { type: String, required: true },
    status: { type: String, default: "pending" },
  },
  {
    timestamps: true,
  }
);

const UpgradeRequestModel = mongoose.model<IUpgradeRequest>(
  "UpgradeRequest",
  UpgradeRequestSchema
);

export default UpgradeRequestModel;
