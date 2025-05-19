import mongoose, { Schema } from "mongoose";

export interface IUserOutput {
  _id: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  discount: boolean;
  verify: boolean;
  isSubscription: boolean;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
  emailNotificationsEnabled: boolean;
  optionEmail?: string;
}

export interface IUser {
  username: string;
  password: string;
  email: string;
  phone: string;
  role: "admin" | "user" | "franchise" | "seller";
  status: "active" | "inactive";
  verify: boolean;
  language: "in" | "cn" | "en" | "vn";
  discount: boolean;
  isSubscription: boolean;
  emailNotificationsEnabled: boolean;
  isPayment: boolean;
  isHideScore: boolean;
  type?: "normal" | "standard" | "premium";
  franchiseName?: string;
  optionEmail?: string;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, unique: true, required: true, index: true },
    password: { type: String, required: true },
    email: { type: String, unique: true, required: true, index: true },
    phone: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: ["admin", "user", "franchise", "seller"],
      default: "user",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
    verify: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      enum: ["in", "cn", "en", "vn"],
      default: "en",
      required: true,
    },
    discount: { type: Boolean, default: false },
    isSubscription: { type: Boolean, default: false },
    emailNotificationsEnabled: { type: Boolean, default: false },
    isPayment: { type: Boolean, default: true },
    isHideScore: { type: Boolean, default: true },
    type: {
      type: String,
      enum: ["normal", "standard", "premium"],
      default: "normal",
    },
    franchiseName: { type: String },
    optionEmail: { type: String },
  },
  {
    timestamps: true,
  }
);

const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
