import mongoose, { Schema } from "mongoose";

interface PackageModel {
  name: string;
  description: string;
  price: number;
  duration: number;
  discount?: number;
  status: boolean;
}

const PackageSchema = new Schema<PackageModel>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  status: { type: Boolean, default: true },
});

const PackageModel = mongoose.model<PackageModel>("Package", PackageSchema);
export default PackageModel;
