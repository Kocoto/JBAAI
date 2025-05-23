import mongoose, { Schema, Types } from "mongoose";

interface UserTrialQuotaLedger {
  campaignId: Types.ObjectId;
  campaignName: string;
  allocatedByFranchiseId: Types.ObjectId;
  totalAllocated: number;
  consumedUser: number;
  status: string;
}

interface FranchiseDetails {
  userId: Types.ObjectId;
  parentId: Types.ObjectId | null;
  franchiseLevel: number;
  ancestorPath: Types.ObjectId[];
  userTrialQuotaLedger: UserTrialQuotaLedger[];
}

const userTrialQuotaLedgerSchema = new Schema<UserTrialQuotaLedger>({
  campaignId: { type: Schema.Types.ObjectId, required: true },
  campaignName: { type: String, required: true },
  allocatedByFranchiseId: { type: Schema.Types.ObjectId, required: true },
  totalAllocated: { type: Number, required: true },
  consumedUser: { type: Number, required: true, default: 0 },
  status: { type: String, required: true },
});

const franchiseDetailsSchema = new Schema<FranchiseDetails>({
  userId: { type: Schema.Types.ObjectId, required: true },
  parentId: { type: Schema.Types.ObjectId, default: null },
  franchiseLevel: { type: Number, required: true },
  ancestorPath: [{ type: Schema.Types.ObjectId }],
  userTrialQuotaLedger: [userTrialQuotaLedgerSchema],
});

export const FranchiseDetailsModel = mongoose.model<FranchiseDetails>(
  "FranchiseDetails",
  franchiseDetailsSchema
);
