import mongoose, { Schema, model } from "mongoose";

export interface IUserProfile {
  userId: mongoose.Types.ObjectId;
  height: number;
  weight: number;
  age: number;
  gender: "male" | "female";
}

const userProfileSchema = new Schema<IUserProfile>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  height: { type: Number, required: true },
  weight: { type: Number, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ["male", "female"] },
});

const UserProfile = model<IUserProfile>("UserProfile", userProfileSchema);
export default UserProfile;
