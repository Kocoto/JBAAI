import mongoose, { Schema, Types } from "mongoose";

interface Campaign {
  campaignId: Types.ObjectId;
  franchiseOwnerId: Types.ObjectId;
  allocatedByFranchiseId: Types.ObjectId;
  campaignName: string;
  totalAllocated: number;
  consumedUses: number;
  status: string;
  totalRenewed: number;
}

const CampaignSchema = new Schema<Campaign>({
  campaignId: { type: Schema.Types.ObjectId, required: true },
  franchiseOwnerId: { type: Schema.Types.ObjectId, required: true },
  campaignName: { type: String, required: true },
  allocatedByFranchiseId: { type: Schema.Types.ObjectId, required: true },
  totalAllocated: { type: Number, required: true, default: 0 },
  consumedUses: { type: Number, required: true, default: 0 },
  status: { type: String, required: true },
  totalRenewed: { type: Number, required: true, default: 0 },
});

const CampaignModel = mongoose.model<Campaign>("Campaign", CampaignSchema);

export default CampaignModel;
