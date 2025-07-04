import mongoose, { Document, Schema, Types } from "mongoose";

export interface IInvitationCodeInput {
  code: string;
  userId: string;
  status: "active" | "inactive";
  codeType: "USER_TRIAL" | "FRANCHISE_HIERARCHY";
  currentActiveLedgerEntryId?: string;
  totalCumulativeUses?: number;
  packageId: string;
}

export interface IInvitationCode extends Document {
  code: string;
  userId: Types.ObjectId;
  status: "active" | "inactive";
  codeType: "USER_TRIAL" | "FRANCHISE_HIERARCHY";
  currentActiveLedgerEntryId?: Types.ObjectId;
  packageId: Types.ObjectId;
  totalCumulativeUses?: number;
  createdAt?: Date;
  updatedAt?: Date;
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
      default: "inactive",
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
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "Package",
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
