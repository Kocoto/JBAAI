import mongoose from "mongoose";
import {
  IHealthData,
  IBpValue,
  IMetricValue,
  IConfidence,
  IRriPoint,
} from "../models/HealthData.Model"; // Import các interface và model

// Hàm helper để kiểm tra xem một đối tượng có phải là cấu trúc MetricValue gốc (có type) không
function isRawMetricValue(
  obj: any
): obj is { type: number; value: any; confidence?: { level: number } } {
  return obj && typeof obj === "object" && typeof obj.value !== "undefined"; // Kiểm tra cơ bản, có thể cần chặt chẽ hơn
}

// Hàm helper để kiểm tra xem một đối tượng có phải là cấu trúc Confidence gốc không
function isRawConfidence(obj: any): obj is { level: number } {
  return obj && typeof obj === "object" && typeof obj.level === "number";
}

// Hàm helper để kiểm tra xem một mảng có phải là mảng RRI points hợp lệ không
function isValidRriArray(arr: any): arr is IRriPoint[] {
  return (
    Array.isArray(arr) &&
    arr.every(
      (p) =>
        p &&
        typeof p === "object" &&
        typeof p.timestamp === "number" &&
        typeof p.interval === "number"
    )
  );
}

export const transformIncomingData = (rawData: any): Partial<IHealthData> => {
  // const rawData = {
  //   ascvdRisk: { type: 33554432, value: 1 },
  //   bpValue: { diastolic: 74, systolic: 119 },
  //   heartAge: undefined,
  //   hemoglobin: { type: 1048576, value: 15.1 },
  //   hemoglobinA1c: { type: 2097152, value: 7.6 },
  //   highBloodPressureRisk: { type: 16777216, value: 1 },
  //   highFastingGlucoseRisk: undefined,
  //   highHemoglobinA1cRisk: { type: 8388608, value: 3 },
  //   highTotalCholesterolRisk: undefined,
  //   lfhf: { type: 524288, value: 0.647 },
  //   lowHemoglobinRisk: undefined,
  //   meanRRi: { confidence: { level: 3 }, type: 256, value: 972 },
  //   normalizedStressIndex: undefined,
  //   oxygenSaturation: { type: 4, value: 97 },
  //   pnsIndex: { type: 8192, value: 1.4 },
  //   pnsZone: { type: 16384, value: 3 },
  //   prq: { confidence: { level: 2 }, type: 4096, value: 2.9 },
  //   pulseRate: { confidence: { level: 3 }, type: 1, value: 62 },
  //   respirationRate: { confidence: { level: 2 }, type: 2, value: 22 },
  //   rmssd: { type: 512, value: 75 },
  //   rri: {
  //     confidence: { level: 3 },
  //     type: 32,
  //     value: [
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //       [Object],
  //     ],
  //   },
  //   sd1: { type: 1024, value: 54 },
  //   sd2: { type: 2048, value: 60 },
  //   sdnn: { confidence: { level: 3 }, type: 8, value: 57 },
  //   snsIndex: { type: 32768, value: -0.7 },
  //   snsZone: { type: 65536, value: 2 },
  //   stressIndex: { type: 128, value: 78 },
  //   stressLevel: { type: 16, value: 1 },
  //   wellnessIndex: { type: 131072, value: 9 },
  //   wellnessLevel: { type: 262144, value: 3 },
  // };
  // const userId = "67ee2a1bd60273ba8d340c42"; // Giả sử userId là một chuỗi
  const transformedData: Partial<IHealthData> = {
    // userId: new mongoose.Schema.Types.ObjectId(userId), // Chuyển userId string thành ObjectId
    // createdAt sẽ được Mongoose tự động thêm
  };

  for (const key in rawData) {
    if (Object.prototype.hasOwnProperty.call(rawData, key)) {
      const rawValue = (rawData as any)[key];

      // Bỏ qua các giá trị undefined
      if (typeof rawValue === "undefined") {
        continue;
      }

      // Xử lý các trường đặc biệt
      if (key === "bpValue") {
        // Giả sử bpValue từ client đã đúng cấu trúc { diastolic, systolic }
        if (
          rawValue &&
          typeof rawValue.diastolic === "number" &&
          typeof rawValue.systolic === "number"
        ) {
          transformedData.bpValue = rawValue as IBpValue;
        }
        continue; // Chuyển sang key tiếp theo
      }

      if (key === "heartAge" || key === "normalizedStressIndex") {
        // Các trường số đơn giản
        if (typeof rawValue === "number") {
          transformedData[key as keyof IHealthData] = rawValue;
        }
        continue; // Chuyển sang key tiếp theo
      }

      if (key === "rri") {
        // Xử lý RRI: cần value là mảng IRriPoint hợp lệ
        if (rawValue && typeof rawValue === "object") {
          const rriValue = rawValue.value;
          // --- !!! QUAN TRỌNG: Kiểm tra dữ liệu rri.value ---
          if (!isValidRriArray(rriValue)) {
            // Nếu dữ liệu không phải mảng hợp lệ (ví dụ: vẫn là [[Object],...])
            // Bạn cần quyết định: Báo lỗi? Bỏ qua trường rri? Ghi log?
            // Ở đây ví dụ là bỏ qua và ghi log
            console.warn(
              `Invalid or missing rri.value data for userId. Received:`,
              rriValue
            );
            continue; // Bỏ qua trường rri này
          }
          // --- Hết phần kiểm tra ---

          transformedData.rri = {
            value: rriValue, // Dữ liệu mảng RRI hợp lệ
            confidence: isRawConfidence(rawValue.confidence)
              ? rawValue.confidence
              : undefined,
          };
        }
        continue; // Chuyển sang key tiếp theo
      }

      // Xử lý các trường có cấu trúc MetricValue chung (đã bỏ type)
      if (isRawMetricValue(rawValue)) {
        // Chỉ lấy value và confidence (nếu có)
        transformedData[key as keyof IHealthData] = {
          value: rawValue.value,
          confidence: isRawConfidence(rawValue.confidence)
            ? rawValue.confidence
            : undefined,
        } as IMetricValue<any>; // Cần ép kiểu vì key là động
      }
      // Các trường không khớp với các xử lý trên sẽ bị bỏ qua
    }
  }

  return transformedData;
};
