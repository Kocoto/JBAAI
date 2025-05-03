import { Schema, Types, model } from "mongoose";

interface IToken {
  userId: Types.ObjectId;
  token: string;
  clientId: string;
  status: {
    type: string;
    enum: ["active", "inactive"];
    default: "active";
    required: true;
    expiresAt: Date;
  };
}

const tokenSchema = new Schema<IToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true },
    clientId: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
      expiresAt: { type: Date, required: true },
    },
  },
  {
    timestamps: true,
  }
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ userId: 1, clientId: 1 });
tokenSchema.index({ userId: 1, clientId: 1, status: 1 });
const Token = model<IToken>("Token", tokenSchema);
export default Token;
