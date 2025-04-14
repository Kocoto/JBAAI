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
        res.status(200).json({
          message: "Lấy dữ liệu sức khỏe thành công",
          data: healthData,
        });
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
      const rawData = req.body.healthData;
      // const rawData = {
      //   ascvdRisk: { type: 33554432, value: 1 },
      //   bpValue: { diastolic: 79, systolic: 121 },
      //   hemoglobin: { type: 1048576, value: 12.8 },
      //   hemoglobinA1c: { type: 2097152, value: 6.07 },
      //   highBloodPressureRisk: { type: 16777216, value: 1 },
      //   highHemoglobinA1cRisk: { type: 8388608, value: 2 },
      //   lfhf: { type: 524288, value: 0.955 },
      //   meanRRi: { type: 256, value: 1001, confidence: { level: 3 } },
      //   oxygenSaturation: { type: 4, value: 99 },
      //   pnsIndex: { type: 8192, value: 1.1 },
      //   pnsZone: { type: 16384, value: 3 },
      //   prq: { type: 4096, value: 3.2, confidence: { level: 2 } },
      //   pulseRate: { type: 1, value: 61, confidence: { level: 3 } },
      //   rmssd: { type: 512, value: 65 },
      //   rri: {
      //     type: 32,
      //     value: [
      //       { timestamp: 5.667, interval: 947 },
      //       { timestamp: 6.728, interval: 1062 },
      //       { timestamp: 7.73, interval: 1002 },
      //       { timestamp: 8.639, interval: 909 },
      //       { timestamp: 9.511, interval: 872 },
      //       { timestamp: 10.428, interval: 918 },
      //       { timestamp: 13.085, interval: 889 },
      //       { timestamp: 13.932, interval: 847 },
      //       { timestamp: 16.526, interval: 858 },
      //       { timestamp: 17.435, interval: 908 },
      //       { timestamp: 18.408, interval: 973 },
      //       { timestamp: 19.406, interval: 998 },
      //       { timestamp: 20.539, interval: 1133 },
      //       { timestamp: 21.611, interval: 1072 },
      //       { timestamp: 22.67, interval: 1059 },
      //       { timestamp: 23.706, interval: 1036 },
      //       { timestamp: 24.744, interval: 1037 },
      //       { timestamp: 25.707, interval: 963 },
      //       { timestamp: 26.73, interval: 1023 },
      //       { timestamp: 27.806, interval: 1076 },
      //       { timestamp: 28.811, interval: 1005 },
      //       { timestamp: 29.806, interval: 996 },
      //       { timestamp: 30.8, interval: 993 },
      //       { timestamp: 31.798, interval: 998 },
      //       { timestamp: 32.854, interval: 1056 },
      //       { timestamp: 33.896, interval: 1042 },
      //       { timestamp: 34.936, interval: 1040 },
      //       { timestamp: 35.96, interval: 1025 },
      //       { timestamp: 36.984, interval: 1024 },
      //       { timestamp: 37.987, interval: 1003 },
      //       { timestamp: 38.94, interval: 952 },
      //       { timestamp: 39.854, interval: 914 },
      //       { timestamp: 40.843, interval: 989 },
      //       { timestamp: 41.89, interval: 1047 },
      //       { timestamp: 42.699, interval: 809 },
      //       { timestamp: 45.145, interval: 911 },
      //       { timestamp: 46.121, interval: 976 },
      //       { timestamp: 47.063, interval: 942 },
      //       { timestamp: 48.038, interval: 975 },
      //       { timestamp: 49.043, interval: 1005 },
      //       { timestamp: 50.071, interval: 1029 },
      //       { timestamp: 51.197, interval: 1125 },
      //       { timestamp: 52.345, interval: 1149 },
      //       { timestamp: 53.442, interval: 1097 },
      //       { timestamp: 54.499, interval: 1058 },
      //       { timestamp: 55.559, interval: 1060 },
      //       { timestamp: 56.7, interval: 1141 },
      //       { timestamp: 57.76, interval: 1060 },
      //       { timestamp: 58.794, interval: 1034 },
      //     ],
      //     confidence: { level: 3 },
      //   },
      //   respirationRate: { type: 2, value: 19, confidence: { level: 2 } },
      //   sd1: { type: 1024, value: 46 },
      //   sd2: { type: 2048, value: 74 },
      //   sdnn: { type: 8, value: 62, confidence: { level: 3 } },
      //   snsIndex: { type: 32768, value: -0.9 },
      //   snsZone: { type: 65536, value: 2 },
      //   stressLevel: { type: 16, value: 1 },
      //   stressIndex: { type: 128, value: 44 },
      //   wellnessIndex: { type: 131072, value: 8 },
      //   wellnessLevel: { type: 262144, value: 3 },
      // };
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

  async deleteHealthData(req: Request, res: Response, next: NextFunction) {
    try {
      const healthDataId = req.body.healthDataI;
      if (!healthDataId) {
        throw new CustomError(400, "Id dữ liệu sức khỏe là bắt buộc");
      }
      const healthData = await HealthDataService.deleteHealthDate(healthDataId);
      res.status(200).json({
        message: "Xóa dữ liệu sức khỏe thành công",
        data: healthData,
      });
      return healthDataId;
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
      const healthData = await HealthDataService.sentMailHealthData(
        email,
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
