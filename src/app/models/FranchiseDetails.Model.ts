import mongoose, { Schema, Types } from "mongoose";

export interface UserTrialQuotaLedger {
  _id: Types.ObjectId;
  sourceCampaignId: Types.ObjectId;
  sourceParentLedgerEntryId?: Types.ObjectId;
  allocatedByUserId: Types.ObjectId;
  totalAllocated: number;
  consumedByOwnInvites: number;
  allocatedToChildren: number;
  status: "active" | "exhausted" | "expired" | "paused";
  createdAt: Date;
  updatedAt: Date;
  originalCampaignStartDate?: Date;
  originalCampaignEndDate?: Date;
}

export interface FranchiseDetails {
  userId: Types.ObjectId;
  parentId: Types.ObjectId | null;
  franchiseLevel: number;
  ancestorPath: Types.ObjectId[];
  userTrialQuotaLedger: UserTrialQuotaLedger[];
  createdAt: Date;
  updatedAt: Date;
}

const userTrialQuotaLedgerSchema = new Schema<UserTrialQuotaLedger>(
  {
    // ID của ledger entry này (ví dụ: LEDGER_F0_A, LEDGER_F1_A)
    _id: { type: Schema.Types.ObjectId, auto: true },

    // Tham chiếu đến Campaign._id - ID của chiến dịch gốc từ admin. Quan trọng cho F0, F1, F2... để truy ngược
    sourceCampaignId: { type: Schema.Types.ObjectId, ref: "Campaign" },

    // Tham chiếu đến FranchiseDetails.userTrialQuotaLedger._id của franchise cha - cho biết quota này được chia từ entry nào của cha
    // Giá trị null nếu là F0 nhận từ admin
    // ref: "FranchiseDetails.userTrialQuotaLedger",
    sourceParentLedgerEntryId: {
      type: Schema.Types.ObjectId,
      default: null,
    },

    // ID của người cấp quota này: admin hoặc franchise cha
    allocatedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Số lượng quota được cấp trong entry này
    totalAllocated: { type: Number, required: true },

    // Số quota đã được franchise này trực tiếp sử dụng để mời người dùng cuối
    consumedByOwnInvites: { type: Number, required: true, default: 0 },

    // Tổng số quota franchise này đã phân bổ cho các con trực tiếp của mình từ entry này
    allocatedToChildren: { type: Number, required: true, default: 0 },

    status: {
      type: String,
      required: true,
      enum: ["active", "exhausted", "expired", "paused"],
    },

    // Ngày bắt đầu của chiến dịch gốc, để tính toán thời hạn nếu cần
    originalCampaignStartDate: { type: Date },

    // Ngày kết thúc của chiến dịch gốc, nếu có
    originalCampaignEndDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

const franchiseDetailsSchema = new Schema<FranchiseDetails>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    parentId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    franchiseLevel: { type: Number, required: true },
    ancestorPath: [{ type: Schema.Types.ObjectId, ref: "User" }],
    userTrialQuotaLedger: [userTrialQuotaLedgerSchema],
  },
  {
    timestamps: true,
  }
);

export const FranchiseDetailsModel = mongoose.model<FranchiseDetails>(
  "FranchiseDetails",
  franchiseDetailsSchema
);
