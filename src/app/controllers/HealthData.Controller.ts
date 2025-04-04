import { Request, Response, NextFunction } from "express";
import CustomError from "../utils/Error.Util";
import HealthDataService from "../services/HealthData.Service";
class HealthDataController {
  async getHealthData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const date = req.body.date;
      if (!date) {
        throw new CustomError(400, "Ngày là bắt buộc");
      }
      const healthData = await HealthDataService.getHealthDataByDate(
        userId,
        date
      );
      res.status(200).json({
        message: "Lấy dữ liệu sức khỏe thành công",
        data: healthData,
      });
    } catch (error) {
      next(error);
    }
  }

  async createHealthData(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const rawData = req.body;
      if (!rawData) {
        throw new CustomError(400, "Dữ liệu sức khỏe là bắt buộc");
      }
      const healthData = await HealthDataService.createHealthData(
        userId,
        rawData
      );
      res.status(201).json({
        message: "Tạo dữ liệu sức khỏe thành công",
        data: healthData,
      });
    } catch (error) {
      next(error);
    }
  }
}
export default new HealthDataController();
