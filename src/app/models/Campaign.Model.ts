import mongoose, { Schema, Types } from "mongoose";

export interface Campaign {
  // Campaign name
  campaignName: string;

  // Reference to User._id of F0 who received this campaign
  franchiseOwnerId: Types.ObjectId;

  // Total trial invites allocated for this entire campaign
  totalAllocated: number;

  // Total invites used from this campaign, including sub-franchises
  consumedUses: number;

  // Total users who renewed from this campaign
  totalRenewed: number;

  // Campaign status (e.g., "active", "completed", "expired")
  status: string;

  // Campaign duration dates (if time-limited)
  startDate?: Date;
  endDate?: Date;

  // Renewal requirement percentage (e.g., 20 means 20% required for F0 to get new campaign)
  renewalRequirementPercentage: number;

  packageId: Types.ObjectId;

  createdBy: Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<Campaign>(
  {
    franchiseOwnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    campaignName: { type: String, required: true },
    totalAllocated: { type: Number, required: true, default: 0 },
    consumedUses: { type: Number, required: true, default: 0 },
    status: { type: String, required: true },
    totalRenewed: { type: Number, required: true, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    renewalRequirementPercentage: { type: Number, required: true },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const CampaignModel = mongoose.model<Campaign>("Campaign", CampaignSchema);

export default CampaignModel;
