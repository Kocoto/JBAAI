import { NextFunction, Request, Response } from "express";
import ProfileService from "../services/Profile.Service";
import CustomError from "../utils/Error.Util";

class ProfileController {
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      if (!userId) {
        throw new CustomError(400, "User not found");
      }
      const profile = req.body;
      console.log(
        "This is log line 13 of profile.controller.ts to check profile value: " +
          JSON.stringify(profile, null, 2) +
          "userId: " +
          userId
      );
      if (!profile) {
        throw new CustomError(400, "User information is required");
      }
      const result = await ProfileService.updateProfile(userId, profile);
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
      return res.status(200).json({
        message: "User information retrieved successfully",
        data: result,
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
