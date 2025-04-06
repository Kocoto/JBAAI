import mongoose, { Schema } from "mongoose";

interface PackageModel {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  duration: number;
  discount?: number;
  status: boolean;
  type: "standard" | "premium";
}

const PackageSchema = new Schema<PackageModel>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  status: { type: Boolean, default: true },
  type: { type: String, enum: ["standard", "premium"], required: true },
});

const PackageModel = mongoose.model<PackageModel>("Package", PackageSchema);
export default PackageModel;
