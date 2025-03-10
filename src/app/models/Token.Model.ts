import mongoose, { Schema } from "mongoose";

interface IToken {
  userId: mongoose.Types.ObjectId;
  token: string;
  clientId: string;
  status: {
    type: string;
    enum: ["active", "inactive"];
    default: "active";
    required: true;
  };
}

const tokenSchema = new Schema<IToken>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true },
  clientId: { type: String, required: true },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
    required: true,
  },
});
const Token = mongoose.model<IToken>("Token", tokenSchema);
export default Token;
