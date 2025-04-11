import { HealthDataModel } from "../models/HealthData.Model";
import CustomError from "../utils/Error.Util";
import { transformIncomingData } from "../utils/FormatData.Util";

class HealthDataService {
  async createHealthData(userId: string, rawData: any) {
    try {
      const data = transformIncomingData(rawData);
      const healthData = await HealthDataModel.create({ userId, ...data });
      if (!healthData) {
        throw new CustomError(400, "Không thể tạo health data");
      }
      return healthData;
    } catch (error) {
      if (error instanceof Error) {
        if (error instanceof CustomError) throw error;
      }
      throw new CustomError(500, error as string);
    }
  }
  async getHealthDataByDate(userId: string, date: string) {
    try {
      const [day, month, year] = date.split("/");
      const startDate = new Date(+year, +month - 1, +day);
      const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      const healthData = await HealthDataModel.find({
        userId,
        createdAt: { $gte: startDate, $lt: endDate },
      });
      return healthData;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async deleteHealthDate(healthDataId: string) {
    try {
      const healthData = await HealthDataModel.findByIdAndDelete(healthDataId);
      if (!healthData) {
        throw new CustomError(400, "Không thể xóa health data");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }

  async getOneHealthData(userId: string) {
    try {
      const healthData = await HealthDataModel.findOne({ userId })
        .sort({ createdAt: -1 })
        .exec();
      if (!healthData) {
        throw new CustomError(400, "Không thể lấy health data");
      }
      return healthData;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }
}

export default new HealthDataService();
