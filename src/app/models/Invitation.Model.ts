import mongoose, { Schema, Types } from "mongoose";

export interface IInvitation {
  invitedUserId: Types.ObjectId;
  inviterUserId: Types.ObjectId;
  invitationCodeId: Types.ObjectId;
  linkedLedgerEntryId: Types.ObjectId;
  linkedRootCampaignId: Types.ObjectId;
  inviteType: "USER_TRIAL" | "FRANCHISE_HIERARCHY";
  createdAt?: Date;
  updatedAt?: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    invitedUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    inviterUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitationCodeId: {
      type: Schema.Types.ObjectId,
      ref: "InvitationCode",
      required: true,
    },
    linkedLedgerEntryId: {
      type: Schema.Types.ObjectId,
      ref: "UserTrialQuotaLedger",
      required: true,
    },
    linkedRootCampaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    inviteType: {
      type: String,
      enum: ["USER_TRIAL", "FRANCHISE_HIERARCHY"],
      required: true,
    },
  },
  { timestamps: true }
);

const InvitationModel = mongoose.model<IInvitation>(
  "Invitation",
  InvitationSchema
);
export default InvitationModel;
