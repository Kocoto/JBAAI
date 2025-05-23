import mongoose, { Schema, Types } from "mongoose";

interface Campaign {
  campaignId: Types.ObjectId;
  campaignName: string;
  allocatedByFranchiseId: Types.ObjectId;
  totalAllocated: number;
  consumedUses: number;
  status: string;
}

const CampaignSchema = new Schema<Campaign>({
  campaignId: { type: Schema.Types.ObjectId, required: true },
  campaignName: { type: String, required: true },
  allocatedByFranchiseId: { type: Schema.Types.ObjectId, required: true },
  totalAllocated: { type: Number, required: true, default: 0 },
  consumedUses: { type: Number, required: true, default: 0 },
  status: { type: String, required: true },
});

const CampaignModel = mongoose.model<Campaign>("Campaign", CampaignSchema);

export default CampaignModel;
