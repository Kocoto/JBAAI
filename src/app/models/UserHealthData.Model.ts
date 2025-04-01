import mongoose, { Schema, model } from "mongoose";

interface IUserHealthData {
  userId: mongoose.Types.ObjectId;
  data: {
    heartRate: number;
    bloodPressure: string;
    temperature: number;
    steps: number;
  };
}
