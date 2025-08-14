import { tryCatch } from "bullmq";
import RingModel, { IRing } from "../models/Ring.Model";
import CustomError from "../utils/Error.Util";
import mongoose from "mongoose";

class RingService {
  async createRing(ring: IRing, session?: mongoose.ClientSession) {
    try {
      console.log("aaaaaaa", ring);

      // Đảm bảo truyền một mảng vào RingModel.create
      const newRing = await RingModel.create([ring], { session });
      if (!newRing || newRing.length === 0) {
        throw new CustomError(400, "Failed to create ring");
      }

      return newRing[0]; // Trả về phần tử đầu tiên của mảng
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }
  async getRing(
    userId: mongoose.Types.ObjectId,
    session?: mongoose.ClientSession
  ) {
    try {
      const ring = await RingModel.findOne({ userId }).session(session || null);

      if (!ring) {
        throw new CustomError(400, "Failed to get ring");
      }

      return ring;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async updateRing(userId: mongoose.Types.ObjectId, ring: Partial<IRing>) {
    try {
      const updatedRing = await RingModel.findOneAndUpdate({ userId }, ring, {
        new: true,
      });
      if (!updatedRing) {
        throw new CustomError(400, "Failed to up date ring");
      }

      return updatedRing;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }
}

export default new RingService();
