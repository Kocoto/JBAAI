import mongoose, { Schema } from "mongoose";

export interface IUser {
  username: string;
  password: string;
  email: string;
  gender: string;
  phone: string;
  role: {
    type: string;
    enum: ["admin", "user"];
    default: "user";
    required: true;
  };
  status: {
    type: string;
    enum: ["active", "inactive"];
    default: "active";
    required: true;
  };
  verify: boolean;
  birthday?: string;
  avatar?: string;
  address?: string;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    gender: { type: String, required: true },
    phone: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "user"],
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
    birthday: { type: String },
    avatar: { type: String },
    address: { type: String },
  },
  { timestamps: true }
);

const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
