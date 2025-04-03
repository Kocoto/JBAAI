import { HealthDataModel } from "../models/HealthData.Model";
import CustomError from "../utils/Error.Util";
import { transformIncomingData } from "../utils/FormatData.Util";

class HealthDataService {
  async createHealthData() {
    try {
      const data = transformIncomingData();
      const userId = "67ee2a1bd60273ba8d340c42";
      const healthData = await HealthDataModel.create({ userId, ...data });
      return healthData;
    } catch (error) {
      if (error instanceof Error) {
        if (error instanceof CustomError) throw error;
        console.log(error);
        throw new CustomError(500, "Lỗi khi lưu health data");
      }
    }
  }
  async getHealthDataByDate() {}

  async deleteHealthDate() {}
}

export default new HealthDataService();
