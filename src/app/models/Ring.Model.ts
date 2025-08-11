import mongoose from "mongoose";

export interface IRing {
  userId: mongoose.Types.ObjectId;
  calories: number;
  steps: number;
  step_length: number;
  duration: number;
}

const ringSchema = new mongoose.Schema<IRing>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    calories: { type: Number, default: 0 },
    steps: { type: Number, default: 0 },
    step_length: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

const RingModel = mongoose.model<IRing>("Ring", ringSchema);
export default RingModel;
