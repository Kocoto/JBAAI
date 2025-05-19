import mongoose, { Schema } from "mongoose";

export interface IPackage {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  currency: "VND" | "USD";
  price: number;
  duration: number;
  discount?: number;
  status: boolean;
  type: "standard" | "premium";
  location: string;
}

const PackageSchema = new Schema<IPackage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    currency: { type: String, enum: ["VND", "USD"], default: "USD" },
    status: { type: Boolean, default: true },
    type: { type: String, enum: ["standard", "premium"], required: true },
    location: { type: String, default: "other" }, // Thêm trường location ở đây
  },
  {
    timestamps: true,
  }
);

const PackageModel = mongoose.model<IPackage>("Package", PackageSchema);
export default PackageModel;
