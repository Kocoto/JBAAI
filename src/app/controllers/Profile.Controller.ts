import { NextFunction, Request, Response } from "express";
import ProfileService from "../services/Profile.Service";
import CustomError from "../utils/Error.Util";
import RingService from "../services/Ring.Service";

class ProfileController {
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      if (!userId) {
        throw new CustomError(400, "User not found");
      }
      const {
        height,
        weight,
        age,
        gender,
        smoking,
        calories,
        steps,
        step_length,
        duration,
      } = req.body;

      const profile = {
        height,
        weight,
        age,
        gender,
        smoking,
      };

      const ring = {
        calories,
        steps,
        step_length,
        duration,
      };

      if (!profile) {
        throw new CustomError(400, "User information is required");
      }
      const result = await ProfileService.updateProfile(userId, profile);
      const ringResult = await RingService.updateRing(userId, ring);

      if (!result) {
        throw new CustomError(400, "User information not found");
      }
      if (!ringResult) {
        throw new CustomError(400, "Ring information not found");
      }

      return res.status(200).json({
        message: "User information updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      if (!userId) {
        throw new CustomError(400, "User not found");
      }
      const result = await ProfileService.getProfile(userId);
      if (!result) {
        throw new CustomError(400, "User information not found");
      }
      const ringResult = await RingService.getRing(userId);
      if (!ringResult) {
        throw new CustomError(400, "Ring information not found");
      }
      return res.status(200).json({
        message: "User information retrieved successfully",
        data: {
          profile: result,
          ring: ringResult,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async createProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      if (!userId) {
        throw new CustomError(400, "User not found");
      }
      const profile = req.body;
      if (!profile) {
        throw new CustomError(400, "User information not found");
      }
      const result = await ProfileService.createProfile(userId, profile);
      if (!result) {
        throw new CustomError(400, "User information not found");
      }
      return res.status(200).json({
        message: "User information updated successfully",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProfileController();
