import e, { Request, Response, NextFunction } from "express";
import CustomError from "../utils/Error.Util";
import HealthDataService from "../services/HealthData.Service";
class HealthDataController {
  async getHealthDataByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const date = req.body.date;
      if (!date) {
        const healthData = await HealthDataService.getOneHealthData(userId);

        return res.status(200).json({
          message: "Lấy dữ liệu sức khỏe thành công",
          data: healthData,
        });
      }
      const healthData = await HealthDataService.getHealthDataByDate(
        userId,
        date
      );
      return res.status(200).json({
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
      const rawData = req.body.healthData;
      if (!rawData) {
        throw new CustomError(400, "Dữ liệu sức khỏe là bắt buộc");
      }
      const healthData = await HealthDataService.createHealthData(
        userId,
        rawData
      );
      return res.status(201).json({
        message: "Tạo dữ liệu sức khỏe thành công",
        data: healthData,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteHealthData(req: Request, res: Response, next: NextFunction) {
    try {
      const healthDataId = req.body.healthDataId;
      if (!healthDataId) {
        throw new CustomError(400, "Id dữ liệu sức khỏe là bắt buộc");
      }
      const healthData = await HealthDataService.deleteHealthDate(healthDataId);
      return res.status(200).json({
        message: "Xóa dữ liệu sức khỏe thành công",
        data: healthData,
      });
    } catch (error) {
      next(error);
    }
  }

  async senMailHealthData(req: Request, res: Response, next: NextFunction) {
    try {
      const email = req.user.email;
      const rawData = req.body.healthData;
      if (!email || !rawData) {
        throw new CustomError(400, "Email và dữ liệu sức khỏe là bắt buộc");
      }
      const username = req.user.username;
      const healthData = await HealthDataService.sentMailHealthData(
        email,
        username,
        rawData
      );
      return res.status(200).json({
        message: "Gửi email thành công",
        data: healthData,
      });
    } catch (error) {
      next(error);
    }
  }
}
export default new HealthDataController();
