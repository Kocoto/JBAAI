import mongoose, { Document, Schema, Types } from "mongoose";

export interface IInvitationCode extends Document {
  code: string;
  userId: Types.ObjectId;
  status: "active" | "inactive";
  numberOfUses: number;
}

const InvitationCodeSchema = new Schema<IInvitationCode>(
  {
    code: { type: String, required: true, unique: true, index: true },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      index: true,
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
