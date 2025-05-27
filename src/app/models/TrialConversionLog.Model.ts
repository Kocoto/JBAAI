import mongoose, { Schema } from "mongoose";

interface ITrialConversionLog extends Document {
  userId: Schema.Types.ObjectId;
  invitationId: Schema.Types.ObjectId;
  campaignId: Schema.Types.ObjectId;
  franchiseId: Schema.Types.ObjectId; // FranchiseDetails._id
  trialStartDate: Date;
  trialEndDate: Date;
  didRenew: boolean;
  paidSubscriptionId?: Schema.Types.ObjectId; // Subscription._id
}
