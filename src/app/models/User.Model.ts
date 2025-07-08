import mongoose, { Query, Schema } from "mongoose";

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
  typeLogin: string;
  optionEmail?: string;
  isDeleted: boolean;
  deletedAt: Date | null;
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
  typeLogin: {
    type: "email" | "phone" | "google" | "facebook" | "jba";
    id: string;
  };
  type?: "normal" | "standard" | "premium";
  franchiseName?: string;
  optionEmail?: string;
  isDeleted: boolean;
  deletedAt: Date | null;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
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
    isHideScore: { type: Boolean, default: false },
    type: {
      type: String,
      enum: ["normal", "standard", "premium"],
      default: "normal",
    },
    typeLogin: {
      type: {
        type: String,
        enum: ["email", "phone", "google", "facebook", "jba"],
        default: "email",
      },
      id: { type: String },
    },
    franchiseName: { type: String },
    optionEmail: { type: String },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true, // Thêm index cho trường này để query nhanh hơn
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index cho 'username'
UserSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Index cho 'email'
UserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
  }
);

// Index cho 'phone'
UserSchema.index(
  { phone: 1 },
  {
    unique: true,
    // Áp dụng cho các document chưa bị xóa VÀ có tồn tại trường phone
    partialFilterExpression: {
      isDeleted: { $ne: true },
      phone: { $exists: true },
    },
  }
);

/**
 * Pre-hook middleware để tự động lọc các document đã bị soft delete
 * Áp dụng cho tất cả các query operations bắt đầu bằng 'find'
 */
UserSchema.pre(/^find/, function (this: Query<any, any>, next) {
  try {
    // Tự động thêm điều kiện `isDeleted` không phải là `true`
    this.where({ isDeleted: { $ne: true } });
    next();
  } catch (error) {
    next(error as Error);
  }
});
const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
