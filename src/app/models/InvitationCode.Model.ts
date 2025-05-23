import mongoose, { Document, Schema, Types } from "mongoose";

export interface IInvitationCode extends Document {
  code: string;
  userId: Types.ObjectId;
  status: "active" | "inactive";
  numberOfUses: number;
  codeType: "USER_TRIAL" | "FRANCHISE_HIERARCHY";
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
    numberOfUses: {
      type: Number,
      default: 0,
    },
    codeType: {
      type: String,
      enum: ["USER_TRIAL", "FRANCHISE_HIERARCHY"],
      required: true,
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
