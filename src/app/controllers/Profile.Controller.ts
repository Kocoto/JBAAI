import { NextFunction, Request, Response } from "express";
import ProfileService from "../services/Profile.Service";
import CustomError from "../utils/Error.Util";

class ProfileController {
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;
      if (!userId) {
        throw new CustomError(400, "Không tìm thấy người dùng");
      }
      const profile = req.body;
      console.log(
        "Đây là log dòng số 13 của trang profile.controller.ts` dùng để kiểm tra giá trị của profile: " +
          JSON.stringify(profile, null, 2) +
          "userId: " +
          userId
      );
      if (!profile) {
        throw new CustomError(400, "Cần nhập thông tin người dùng ");
      }
      const result = await ProfileService.updateProfile(userId, profile);
      if (!result) {
        throw new CustomError(400, "Không tìm thấy thông tin người dùng");
      }
      return res.status(200).json({
        message: "Cập nhật thông tin người dùng thành công",
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
        throw new CustomError(400, "Không tìm thấy người dùng");
      }
      const result = await ProfileService.getProfile(userId);
      if (!result) {
        throw new CustomError(400, "Không tìm thấy thông tin người dùng");
      }
      return res.status(200).json({
        message: "Lấy thông tin người dùng thành công",
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
        throw new CustomError(400, "Không tìm thấy người dùng");
      }
      const profile = req.body;
      if (!profile) {
        throw new CustomError(400, "Không tìm thấy thông tin người dùng");
      }
      const result = await ProfileService.createProfile(userId, profile);
      if (!result) {
        throw new CustomError(400, "Không tìm thấy thông tin người dùng");
      }
      return res.status(200).json({
        message: "Cập nhật thông tin người dùng thành công",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProfileController();
