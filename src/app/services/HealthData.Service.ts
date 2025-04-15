import { HealthDataModel } from "../models/HealthData.Model";
import CustomError from "../utils/Error.Util";
import { transformIncomingData } from "../utils/FormatData.Util";
import { renderEmailTemplate, sendMail } from "../utils/Mail.Util";

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

      return healthData;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }
  async sentMailHealthData(email: string, username: string, rawData: any) {
    try {
      const data = transformIncomingData(rawData);
      if (!data) {
        throw new CustomError(400, "Không thể lấy health data");
      }
      console.log(
        "Đây là log dòng số 76 của trang HealthData.Service.ts dùng để kiểm tra giá trị của data: " +
          JSON.stringify(data, null, 2)
      );
      const htmlContent = await renderEmailTemplate(
        "en",
        username,
        data,
        "Đây là chart"
      );
      const mailOptions = {
        from: "JBA AI",
        to: email,
        subject: "Health Data",
        html: htmlContent,
        attachments: [
          {
            filename: "logo-JBAAI-2.png",
            path: path.join(
              __dirname,
              "..",
              "templates",
              "logo",
              "logo-JBAAI-2.png"
            ),
            cid: "logo-JBAAI-2.png", //same cid value as in the html img src
          },
        ],
      };
      const mail = await sendMail(mailOptions);
      return mail;
    } catch (error) {}
  }
}
import * as path from "path";
export default new HealthDataService();
