import mongoose, { Schema } from "mongoose";

interface IOtp {
  userId: mongoose.Types.ObjectId;
  otp: string;
  email: string;
  expiresAt: Date;
  updatedAt?: Date;
  createdAt?: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    otp: { type: String, required: true },
    email: { type: String, required: true },
    expiresAt: { type: Date, default: Date.now, expires: 300 },
  },
  {
    timestamps: true,
  }
);

const OtpModel = mongoose.model<IOtp>("Otp", OtpSchema);
export default OtpModel;
