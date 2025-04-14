import mongoose, { Schema, Document } from "mongoose";

// --- Định nghĩa các Interface TypeScript tương ứng (đã bỏ type) ---

// Interface cho phần confidence (nếu có)
interface IConfidence {
  level: number;
}

// Interface cho giá trị huyết áp
interface IBpValue {
  diastolic: number;
  systolic: number;
}

// Interface chung cho các chỉ số (đã bỏ type)
// Giờ đây chỉ chứa giá trị và confidence (tùy chọn)
interface IMetricValue<T> {
  value: T;
  confidence?: IConfidence; // Confidence là tùy chọn
}

// Interface cho một điểm dữ liệu RRI (ví dụ đơn giản)
interface IRriPoint {
  timestamp: number; // Giả sử mỗi điểm RRI có timestamp
  interval: number; // và giá trị
}

// Interface chính cho toàn bộ cấu trúc dữ liệu sức khỏe (đã bỏ type)
interface IHealthData extends Document {
  // Kế thừa Document của Mongoose
  userId: Schema.Types.ObjectId; // ID của người dùng liên quan
  createdAt: Date; // Thời gian tạo bản ghi

  ascvdRisk?: IMetricValue<number>;
  bpValue?: IBpValue; // Huyết áp có cấu trúc riêng
  heartAge?: IMetricValue<number>; // Tuổi tim có thể không xác định (optional)
  hemoglobin?: IMetricValue<number>;
  hemoglobinA1c?: IMetricValue<number>;
  highBloodPressureRisk?: IMetricValue<number>;
  highFastingGlucoseRisk?: IMetricValue<number>; // Có thể không xác định
  highHemoglobinA1cRisk?: IMetricValue<number>;
  highTotalCholesterolRisk?: IMetricValue<number>; // Có thể không xác định
  lfhf?: IMetricValue<number>;
  lowHemoglobinRisk?: IMetricValue<number>; // Có thể không xác định
  meanRRi?: IMetricValue<number>;
  normalizedStressIndex?: IMetricValue<number>; // Có thể không xác định
  oxygenSaturation?: IMetricValue<number>;
  pnsIndex?: IMetricValue<number>;
  pnsZone?: IMetricValue<number>;
  prq?: IMetricValue<number>;
  pulseRate?: IMetricValue<number>;
  respirationRate?: IMetricValue<number>;
  rmssd?: IMetricValue<number>;
  rri?: {
    // RRI có cấu trúc riêng (đã bỏ type)
    confidence?: IConfidence;
    value: IRriPoint[]; // Mảng các điểm RRI
  };
  sd1?: IMetricValue<number>;
  sd2?: IMetricValue<number>;
  sdnn?: IMetricValue<number>;
  snsIndex?: IMetricValue<number>;
  snsZone?: IMetricValue<number>;
  stressIndex?: IMetricValue<number>;
  stressLevel?: IMetricValue<number>;
  wellnessIndex?: IMetricValue<number>;
  wellnessLevel?: IMetricValue<number>;
}

// --- Định nghĩa Mongoose Schemas (đã bỏ type) ---

const ConfidenceSchema = new Schema<IConfidence>(
  {
    level: { type: Number, required: true },
  },
  { _id: false }
);

const BpValueSchema = new Schema<IBpValue>(
  {
    diastolic: { type: Number, required: true },
    systolic: { type: Number, required: true },
  },
  { _id: false }
);

// Schema chung cho các chỉ số (đã bỏ type)
// Giờ chỉ còn value và confidence (tùy chọn)
const NumericMetricValueSchema = new Schema(
  {
    // type: { type: Number, required: true }, // ĐÃ LOẠI BỎ
    value: { type: Number, required: true },
    confidence: { type: ConfidenceSchema, required: false },
  },
  { _id: false }
);

// Schema cho một điểm RRI
const RriPointSchema = new Schema<IRriPoint>(
  {
    timestamp: { type: Number, required: true },
    interval: { type: Number, required: true },
  },
  { _id: false }
);

// Schema chính cho HealthData (đã bỏ type)
const HealthDataSchema = new Schema<IHealthData>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    createdAt: { type: Date, default: Date.now, index: true },

    // Sử dụng NumericMetricValueSchema đã được cập nhật (không còn type)
    ascvdRisk: { type: NumericMetricValueSchema, required: false },
    bpValue: { type: BpValueSchema, required: false },
    heartAge: { type: NumericMetricValueSchema, required: false },
    hemoglobin: { type: NumericMetricValueSchema, required: false },
    hemoglobinA1c: { type: NumericMetricValueSchema, required: false },
    highBloodPressureRisk: { type: NumericMetricValueSchema, required: false },
    highFastingGlucoseRisk: { type: NumericMetricValueSchema, required: false },
    highHemoglobinA1cRisk: { type: NumericMetricValueSchema, required: false },
    highTotalCholesterolRisk: {
      type: NumericMetricValueSchema,
      required: false,
    },
    lfhf: { type: NumericMetricValueSchema, required: false },
    lowHemoglobinRisk: { type: NumericMetricValueSchema, required: false },
    meanRRi: { type: NumericMetricValueSchema, required: false },
    normalizedStressIndex: { type: NumericMetricValueSchema, required: false },
    oxygenSaturation: { type: NumericMetricValueSchema, required: false },
    pnsIndex: { type: NumericMetricValueSchema, required: false },
    pnsZone: { type: NumericMetricValueSchema, required: false },
    prq: { type: NumericMetricValueSchema, required: false },
    pulseRate: { type: NumericMetricValueSchema, required: false },
    respirationRate: { type: NumericMetricValueSchema, required: false },
    rmssd: { type: NumericMetricValueSchema, required: false },
    rri: {
      // Cấu trúc riêng cho RRI (đã bỏ type và sửa lại cấu trúc)
      confidence: { type: ConfidenceSchema, required: false },
      // type: { type: Number, required: true }, // ĐÃ LOẠI BỎ
      value: { type: [RriPointSchema], required: true }, // Mảng các điểm RRI
      // Lưu ý: Cấu trúc lồng nhau với key 'type' bên ngoài đã được loại bỏ để đơn giản hóa
    },
    sd1: { type: NumericMetricValueSchema, required: false },
    sd2: { type: NumericMetricValueSchema, required: false },
    sdnn: { type: NumericMetricValueSchema, required: false },
    snsIndex: { type: NumericMetricValueSchema, required: false },
    snsZone: { type: NumericMetricValueSchema, required: false },
    stressIndex: { type: NumericMetricValueSchema, required: false },
    stressLevel: { type: NumericMetricValueSchema, required: false },
    wellnessIndex: { type: NumericMetricValueSchema, required: false },
    wellnessLevel: { type: NumericMetricValueSchema, required: false },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

// Tạo Model
const HealthDataModel = mongoose.model<IHealthData>(
  "HealthData",
  HealthDataSchema
);

// Export các thành phần cần thiết
export {
  HealthDataModel,
  IHealthData,
  IBpValue,
  IMetricValue,
  IConfidence,
  IRriPoint,
};
