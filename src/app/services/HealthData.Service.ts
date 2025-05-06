import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  getYear,
  parse,
  setWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { HealthDataModel } from "../models/HealthData.Model";
import CustomError from "../utils/Error.Util";
import { transformIncomingData } from "../utils/FormatData.Util";
import { renderEmailTemplate, sendMail } from "../utils/Mail.Util";
import * as path from "path";

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
              "..",
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

  async getHealthDataByDateRange(
    userId: string,
    type: "week" | "month" | "day",
    year: string,
    value: string
  ) {
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const currentYear = getYear(new Date());
    try {
      switch (type) {
        case "day": {
          const date = parse(value, "dd/MM/yyyy", new Date());
          if (!date) {
            throw new CustomError(400, "Không tìm thấy ngày yêu cầu");
          }
          startDate = startOfDay(date);
          endDate = endOfDay(date);
          break;
        }
        case "week": {
          const dateInYear = new Date(currentYear, 0, 1);
          const dateInWeek = setWeek(dateInYear, +value, {
            weekStartsOn: 1,
            firstWeekContainsDate: 4,
          });
          if (!dateInWeek) {
            throw new CustomError(400, "Không tìm thấy tuần yêu cầu");
          }
          startDate = startOfWeek(dateInWeek, { weekStartsOn: 1 });
          endDate = endOfWeek(dateInWeek, { weekStartsOn: 1 });
          break;
        }
        case "month": {
          const monthNum = parseInt(value, 10);
          if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            throw new CustomError(400, "Không tìm thấy tháng yêu cầu");
          }
          const dateInTargetMonth = new Date(currentYear, monthNum - 1, 1);

          startDate = startOfMonth(dateInTargetMonth);
          endDate = endOfMonth(dateInTargetMonth);
          break;
        }
        default:
          throw new CustomError(400, "Không xử lý được loại dữ liệu yêu cầu");
      }

      const aggregationPipeline = [
        {
          $match: {
            userId,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            avgAscvdRisk: { $avg: "$ascvdRisk.value" },
            avgBpValue: { $avg: "$bpValue.systolic" },
            avgHeartAge: { $avg: "$heartAge.value" },
          },
        },
      ];
    } catch (error) {}
  }
}
export default new HealthDataService();
