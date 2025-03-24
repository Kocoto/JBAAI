import mongoose, { Schema } from "mongoose";

export interface IUser {
  username: string;
  password: string;
  email: string;
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
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, unique: true, required: true, index: true },
    password: { type: String, required: true },
    email: { type: String, unique: true, required: true, index: true },
    phone: { type: String, required: true, unique: true },
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
  },
  { timestamps: true }
);

const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
