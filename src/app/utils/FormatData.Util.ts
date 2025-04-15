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
  //   ascvdRisk: { type: 33554432, value: 1 },
  console.log(
    "đây là log dòng số 39 của trang FormatData.Util.ts dùng để kiểm tra giá trị của rawData: " +
      JSON.stringify(rawData)
  );

  // Kiểm tra nếu rawData là null hoặc undefined
  if (!rawData) {
    console.warn("rawData là null hoặc undefined");
    return {};
  }

  // Kiểm tra nếu rawData là chuỗi JSON, thì parse nó thành object
  if (typeof rawData === "string") {
    try {
      rawData = JSON.parse(rawData);
    } catch (error) {
      console.error("Lỗi khi parse rawData từ chuỗi JSON:", error);
      // Nếu không parse được, trả về đối tượng rỗng
      return {};
    }
  }

  // const userId = "67ee2a1bd60273ba8d340c42"; // Giả sử userId là một chuỗi
  const transformedData: Partial<IHealthData> = {};

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
  console.log(
    "đây là log dòng số 191 của trang FormatData.Util.ts dùng để kiểm tra giá trị của transformedData: " +
      JSON.stringify(transformedData)
  );
  return transformedData;
};

if (require.main === module) {
  const testData = {
    ascvdRisk: { type: 33554432, value: 2 },
    bpValue: { diastolic: 74, systolic: 117 },
    heartAge: { type: 268435456, value: 29 },
    hemoglobin: { type: 1048576, value: 10.3 },
    hemoglobinA1c: { type: 2097152, value: 5.82 },
    highBloodPressureRisk: { type: 16777216, value: 1 },
    highFastingGlucoseRisk: { type: 8589934592, value: 3 },
    highHemoglobinA1cRisk: { type: 8388608, value: 1 },
    highTotalCholesterolRisk: { type: 536870912, value: 3 },
    lfhf: { type: 524288, value: 0.46 },
    lowHemoglobinRisk: { type: 17179869184, value: 3 },
    meanRRi: { type: 256, value: 1015, confidence: { level: 3 } },
    normalizedStressIndex: { type: 67108864, value: 23 },
    oxygenSaturation: { type: 4, value: 98 },
    pnsIndex: { type: 8192, value: 1.6 },
    pnsZone: { type: 16384, value: 3 },
    prq: { type: 4096, value: 3.3, confidence: { level: 3 } },
    pulseRate: { type: 1, value: 55, confidence: { level: 3 } },
    rmssd: { type: 512, value: 74 },
    rri: {
      type: 32,
      value: [
        { timestamp: 3.05, interval: 1016 },
        { timestamp: 4.084, interval: 1034 },
        { timestamp: 5.055, interval: 971 },
        { timestamp: 6.079, interval: 1024 },
        { timestamp: 10.044, interval: 1163 },
        { timestamp: 11.12, interval: 1076 },
        { timestamp: 12.117, interval: 997 },
        { timestamp: 15.271, interval: 1163 },
        { timestamp: 16.358, interval: 1087 },
        { timestamp: 17.324, interval: 966 },
        { timestamp: 18.264, interval: 939 },
        { timestamp: 21.269, interval: 976 },
        { timestamp: 22.254, interval: 985 },
        { timestamp: 23.252, interval: 998 },
        { timestamp: 24.305, interval: 1052 },
        { timestamp: 28.18, interval: 1086 },
        { timestamp: 29.148, interval: 968 },
        { timestamp: 30.082, interval: 934 },
        { timestamp: 30.98, interval: 898 },
        { timestamp: 31.898, interval: 918 },
        { timestamp: 32.872, interval: 974 },
        { timestamp: 33.893, interval: 1021 },
        { timestamp: 34.859, interval: 966 },
        { timestamp: 37.703, interval: 914 },
        { timestamp: 38.712, interval: 1009 },
        { timestamp: 39.683, interval: 971 },
        { timestamp: 40.671, interval: 988 },
        { timestamp: 41.712, interval: 1041 },
        { timestamp: 45.162, interval: 1037 },
        { timestamp: 46.076, interval: 914 },
        { timestamp: 48.61, interval: 854 },
        { timestamp: 49.528, interval: 918 },
        { timestamp: 50.649, interval: 1121 },
        { timestamp: 51.808, interval: 1160 },
        { timestamp: 52.838, interval: 1029 },
        { timestamp: 53.889, interval: 1051 },
        { timestamp: 54.989, interval: 1100 },
        { timestamp: 56.012, interval: 1023 },
        { timestamp: 57.127, interval: 1115 },
        { timestamp: 58.226, interval: 1099 },
        { timestamp: 59.282, interval: 1056 },
      ],
      confidence: { level: 3 },
    },
    respirationRate: { type: 2, value: 17, confidence: { level: 3 } },
    sd1: { type: 1024, value: 56 },
    sd2: { type: 2048, value: 70 },
    sdnn: { type: 8, value: 63, confidence: { level: 3 } },
    snsIndex: { type: 32768, value: -1 },
    snsZone: { type: 65536, value: 2 },
    stressLevel: { type: 16, value: 1 },
    stressIndex: { type: 128, value: 49 },
    wellnessIndex: { type: 131072, value: 9 },
    wellnessLevel: { type: 262144, value: 3 },
  };

  console.log("Test Results:", transformIncomingData(testData));
}
