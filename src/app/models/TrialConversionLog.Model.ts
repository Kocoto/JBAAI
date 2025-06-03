import mongoose, { Schema, Document, Types } from "mongoose";

interface ITrialConversionLog extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId; // References User collection - end user who used the trial
  invitationId: Types.ObjectId; // References Invitation._id
  referringFranchiseId: Types.ObjectId; // References User collection - direct inviting franchise (Invitation.inviterUserId)
  rootCampaignId: Types.ObjectId; // Root campaign ID from admin (Invitation.linkedRootCampaignId)
  ledgerEntryIdUsed: Types.ObjectId; // Used entry ID from userTrialQuotaLedger (Invitation.linkedLedgerEntryId)
  trialStartDate: Date;
  trialEndDate: Date;
  didRenew: boolean;
  renewalDate?: Date; // Renewal date if applicable
  paidSubscriptionId?: Types.ObjectId; // References Subscription._id for paid plan if applicable
  createdAt: Date;
  updatedAt: Date;
}

const trialConversionLogSchema = new Schema<ITrialConversionLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    invitationId: {
      type: Schema.Types.ObjectId,
      ref: "Invitation",
      required: true,
    },
    referringFranchiseId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rootCampaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    ledgerEntryIdUsed: {
      type: Schema.Types.ObjectId,
      ref: "UserTrialQuotaLedger",
      required: true,
    },
    trialStartDate: { type: Date, required: true },
    trialEndDate: { type: Date, required: true },
    didRenew: { type: Boolean, required: true, default: false },
    renewalDate: { type: Date },
    paidSubscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription" },
  },
  {
    timestamps: true,
  }
);

export const TrialConversionLogModel = mongoose.model<ITrialConversionLog>(
  "TrialConversionLog",
  trialConversionLogSchema
);
