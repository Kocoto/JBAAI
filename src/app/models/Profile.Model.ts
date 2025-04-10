import mongoose, { Schema, model } from "mongoose";

export interface IProfile {
  userId: mongoose.Types.ObjectId;
  height: number;
  weight: number;
  age: number;
  gender: "male" | "female" | "";
  smokingStatus: number;
}

const profileSchema = new Schema<IProfile>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  height: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  age: { type: Number, default: 0 },
  gender: { type: String, enum: ["male", "female", ""] },
  smokingStatus: { type: Number, default: 0 },
});

const profileModel = model<IProfile>("Profile", profileSchema);
export default profileModel;
