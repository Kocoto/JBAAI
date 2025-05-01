import mongoose, { Schema } from "mongoose";

export interface IUser {
  username: string;
  password: string;
  email: string;
  phone: string;
  role:
    | "admin"
    | "user"
    | "spa"
    | "doctor"
    | "pharmacy"
    | "school"
    | "hospital"
    | "seller";
  status: "active" | "inactive";
  verify: boolean;
  language: "in" | "cn" | "en" | "vn";
  isSubscription: boolean;
  emailNotificationsEnabled: boolean;
  isPayment: boolean;
  isHideScore: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, unique: true, required: true, index: true },
    password: { type: String, required: true },
    email: { type: String, unique: true, required: true, index: true },
    phone: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: [
        "admin",
        "user",
        "spa",
        "doctor",
        "pharmacy",
        "school",
        "hospital",
        "seller",
      ],
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
    isSubscription: { type: Boolean, default: false },
    emailNotificationsEnabled: { type: Boolean, default: false },
    isPayment: { type: Boolean, default: false },
    isHideScore: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
