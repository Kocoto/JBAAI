import { Schema, Types, model } from "mongoose";

interface IOtp {
  userId: Types.ObjectId;
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
    expiresAt: { type: Date, default: Date.now, expires: 600 },
  },
  {
    timestamps: true,
  }
);

const OtpModel = model<IOtp>("Otp", OtpSchema);
export default OtpModel;
