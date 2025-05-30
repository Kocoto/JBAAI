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
  eachDayOfInterval,
  format as formatDateFns,
} from "date-fns";
import { HealthDataModel } from "../models/HealthData.Model";
import CustomError from "../utils/Error.Util";
import { transformIncomingData } from "../utils/FormatData.Util";
import { renderEmailTemplate, sendMail } from "../utils/Mail.Util";
import * as path from "path";
import { Types } from "mongoose";
import { emailQueue } from "../queues/Mail.Queue";

export interface IHealthDataEmailJobPayload {
  emailTo: string;
  targetUsername: string;
  healthReportData: any;
  language: string;
  type: string;
  chart?: string;
}

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
  async sentMailHealthData(
    email: string,
    username: string,
    rawData: any,
    language: string,
    type: string,
    optionEmail?: string
  ): Promise<void> {
    try {
      const transformedData = transformIncomingData(rawData);
      if (!transformedData) {
        throw new CustomError(400, "Không thể lấy health data");
      }

      const jobPayload: IHealthDataEmailJobPayload = {
        emailTo: email,
        targetUsername: username,
        healthReportData: transformedData,
        language: language,
        type: type,
      };

      await emailQueue.add("sendHealthReportEmail", jobPayload);
      console.log(
        `[Service] Job 'sendHealthReportEmail' cho ${email} đã được thêm vào hàng đợi.`
      );
      if (optionEmail) {
        const jobPayload: IHealthDataEmailJobPayload = {
          emailTo: optionEmail,
          targetUsername: username,
          healthReportData: transformedData,
          language: language,
          type: type,
        };

        await emailQueue.add("sendHealthReportEmail", jobPayload);
        console.log(
          `[Service] Job'sendHealthReportEmail' cho ${optionEmail} đã được thêm vào hàng đợi.`
        );
      }
    } catch (error) {
      // << Xử lý lỗi trong catch block >>
      console.error(
        `[Service] Lỗi khi chuẩn bị hoặc thêm job gửi health data email cho ${email} vào queue:`,
        error
      );

      // Ném lỗi ra ngoài để controller có thể bắt và xử lý
      if (error instanceof CustomError) {
        // Nếu là lỗi đã biết (như lỗi transform), ném lại nó
        throw error;
      } else {
        // Nếu là lỗi khác (ví dụ: lỗi kết nối Redis khi .add()), ném lỗi chung
        throw new CustomError(
          500,
          `Không thể xếp hàng tác vụ gửi email health data. Lỗi hệ thống.`
        );
      }
    }
  }

  async getHealthDataByDateRange(
    userId: string,
    type: "week" | "month" | "day",
    value: string
  ) {
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    const splitValue = value.split("/");
    const year = splitValue[splitValue.length - 1];
    const dayValue = splitValue[0];
    try {
      const currentYear = parseInt(year, 10);

      if (isNaN(currentYear) || year.length !== 4) {
        throw new CustomError(400, "Không tìm thấy năm yêu cầu");
      }

      switch (type) {
        case "day": {
          const date = parse(value, "dd/MM/yyyy", new Date());

          if (isNaN(date.getTime())) {
            throw new CustomError(
              400,
              "Định dạng ngày không hợp lệ hoặc ngày không tồn tại."
            );
          }
          startDate = startOfDay(date);
          endDate = endOfDay(date);
          break;
        }
        case "week": {
          const dateInYear = new Date(currentYear, 0, 1);
          const weekNum = parseInt(dayValue, 10);

          if (isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
            throw new CustomError(400, "Số tuần không hợp lệ.");
          }
          const dateInWeek = setWeek(dateInYear, +dayValue, {
            weekStartsOn: 1,
            firstWeekContainsDate: 4,
          });

          if (isNaN(dateInWeek.getTime())) {
            throw new CustomError(
              400,
              "Không tìm thấy tuần yêu cầu từ giá trị đã cho."
            );
          }
          startDate = startOfWeek(dateInWeek, { weekStartsOn: 1 });
          endDate = endOfWeek(dateInWeek, { weekStartsOn: 1 });
          break;
        }
        case "month": {
          const monthNum = parseInt(dayValue, 10);

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

      if (
        !startDate ||
        !endDate ||
        isNaN(startDate.getTime()) ||
        isNaN(endDate.getTime())
      ) {
        throw new CustomError(
          500,
          "Không thể xác định khoảng ngày hợp lệ để xử lý."
        );
      }

      const aggregationPipeline = [
        {
          $match: {
            userId: new Types.ObjectId(userId),
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } },
            count: { $sum: 1 },
            data: { $push: "$$ROOT" },
          },
        },
        {
          $sort: {
            _id: 1 as const,
          },
        },
      ];

      const result = await HealthDataModel.aggregate(aggregationPipeline);
      const resultMap = new Map(result.map((item) => [item._id, item]));
      const allDatesInPeriod = eachDayOfInterval({
        start: startDate,
        end: endDate,
      });

      const formattedResult = allDatesInPeriod.map((dateInLoop) => {
        const dateString = formatDateFns(dateInLoop, "dd-MM-yyyy");

        if (resultMap.has(dateString)) {
          return resultMap.get(dateString);
        } else {
          return {
            _id: dateString,
            count: 0,
            data: [
              {
                _id: null,
                userId: userId,
                bpValue: {
                  diastolic: 0,
                  systolic: 0,
                },
                hemoglobin: {
                  value: 0,
                },
                hemoglobinA1c: {
                  value: 0,
                },
                highBloodPressureRisk: {
                  value: 0,
                },
                highFastingGlucoseRisk: {
                  value: 0,
                },
                highHemoglobinA1cRisk: {
                  value: 0,
                },
                highTotalCholesterolRisk: {
                  value: 0,
                },
                lfhf: {
                  value: 0,
                },
                lowHemoglobinRisk: {
                  value: 0,
                },
                meanRRi: {
                  value: 0,
                  confidence: {
                    level: 0,
                  },
                },
                normalizedStressIndex: {
                  value: 0,
                },
                oxygenSaturation: {
                  value: 0,
                },
                pnsIndex: {
                  value: 0,
                },
                pnsZone: {
                  value: 0,
                },
                prq: {
                  value: 0,
                  confidence: {
                    level: 0,
                  },
                },
                pulseRate: {
                  value: 0,
                  confidence: {
                    level: 0,
                  },
                },
                respirationRate: {
                  value: 0,
                  confidence: {
                    level: 0,
                  },
                },
                rmssd: {
                  value: 0,
                },
                rri: {
                  confidence: {
                    level: 0,
                  },
                  value: [],
                },
                sd1: {
                  value: 0,
                },
                sd2: {
                  value: 0,
                },
                sdnn: {
                  value: 0,
                  confidence: {
                    level: 0,
                  },
                },
                snsIndex: {
                  value: 0,
                },
                snsZone: {
                  value: 0,
                },
                stressIndex: {
                  value: 0,
                },
                stressLevel: {
                  value: 0,
                },
                wellnessIndex: {
                  value: 0,
                },
                wellnessLevel: {
                  value: 0,
                },
                createdAt: new Date(),
                __v: 0,
              },
            ],
          };
        }
      });

      return formattedResult;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, "Lỗi máy chủ khi lấy dữ liệu sức khỏe.");
    }
  }
}
export default new HealthDataService();
