import { NextFunction, Request, Response } from "express";
import CustomError from "../utils/Error.Util";
import PackageService from "../services/Package.Service";

class PackageController {
  async createPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user._id;

      const { name, price, description, duration, type } = req.body;
      console.log(
        "Đây là là dòng số 10 của trang PackageController để kiểm tra: " +
          //   userId +
          name +
          price +
          description +
          duration +
          type
      );
      if (!name || !price || !description || !duration || !type) {
        throw new CustomError(
          400,
          "Tên, giá, mô tả, thời gian và loại là bắt buộc"
        );
      }
      const packageData = {
        userId,
        name,
        price,
        description,
        duration,
        type,
      };

      const result = await PackageService.createPackage(packageData);
      res.status(200).json({
        message: "Tạo gói thành công",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllPackages(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PackageService.getAllPackages();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPackageByType(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.body;
      if (!type) {
        throw new CustomError(400, "Loại gói là bắt buộc");
      }
      const result = await PackageService.getPackageByType(type);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPackageById(req: Request, res: Response, next: NextFunction) {
    try {
      const packageId = req.params.id;
      if (!packageId) {
        throw new CustomError(400, "Id gói là bắt buộc");
      }
      const result = await PackageService.getPackageById(packageId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PackageController();
