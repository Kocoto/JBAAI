import mongoose, { Schema, model } from "mongoose";

export interface IProfile {
  userId: mongoose.Types.ObjectId;
  height: number;
  weight: number;
  age: number;
  gender: "male" | "female";
}

const profileSchema = new Schema<IProfile>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  height: { type: Number, required: true },
  weight: { type: Number, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ["male", "female"] },
});

const profileModel = model<IProfile>("Profile", profileSchema);
export default profileModel;
