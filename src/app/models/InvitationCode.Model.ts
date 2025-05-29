import mongoose, { Document, Schema, Types } from "mongoose";

export interface IInvitationCode extends Document {
  code: string;
  userId: Types.ObjectId;
  status: "active" | "inactive";
  codeType: "USER_TRIAL" | "FRANCHISE_HIERARCHY";
  currentActiveLedgerEntryId?: Types.ObjectId;
  totalCumulativeUses?: number;
}

const InvitationCodeSchema = new Schema<IInvitationCode>(
  {
    code: { type: String, required: true, unique: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
    codeType: {
      type: String,
      enum: ["USER_TRIAL", "FRANCHISE_HIERARCHY"],
      required: true,
    },
    currentActiveLedgerEntryId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    totalCumulativeUses: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const InvitationCodeModel = mongoose.model<IInvitationCode>(
  "InvitationCode",
  InvitationCodeSchema
);

export default InvitationCodeModel;
