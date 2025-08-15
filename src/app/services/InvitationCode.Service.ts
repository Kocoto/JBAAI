import { ClientSession } from "mongoose";
import mongoose from "mongoose";
import InvitationCodeModel from "../models/InvitationCode.Model";
import CustomError from "../utils/Error.Util";
import { generateInviteCode, generateOTP } from "../utils/OTP.Util";
import CampaignModel from "../models/Campaign.Model";
import { FranchiseDetailsModel } from "../models/FranchiseDetails.Model";

class InvitationCodeService {
  async createInvitationCode(
    userId: string,
    code: string,
    codeType: string,
    session?: mongoose.ClientSession
  ) {
    const otp = generateOTP(4);
    const validCode = code + otp;
    // Errors will be thrown directly for parent withTransaction to handle
    const newCode = await InvitationCodeModel.create(
      [
        {
          code: validCode,
          userId: userId,
          codeType,
          status: "inactive",
        },
      ],
      { session }
    );

    // Bạn có thể giữ log này để debug, nhưng hãy hiểu nó chỉ là "thành công tạm thời"
    // console.log(`Đã xếp mã ${validCode} vào transaction.`);

    return newCode[0].code;
  }
  async checkCode(code: string, session?: ClientSession) {
    try {
      const checkCode = await InvitationCodeModel.findOne({
        code: code,
        status: "active",
      }).session(session || null);
      if (!checkCode) {
        throw new CustomError(400, "Invalid invitation code");
      }
      return checkCode;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }
  async checkCodeIsInvalid(code: string) {
    try {
      const checkCode = await InvitationCodeModel.findOne({ code: code });
      if (checkCode) {
        throw new CustomError(400, "Invitation code already exists");
      }
      return true;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }
  async getCodeByUserId(userId: string) {
    try {
      const code = await InvitationCodeModel.find({ userId: userId });
      return code;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async activeInvitationCode(userId: string) {
    try {
      const franchiseDetail = await FranchiseDetailsModel.aggregate([
        {
          $match: { userId: userId },
        },
        {
          $project: {
            userId: 1,
            parentId: 1,
            franchiseLevel: 1,
            ancestorPath: 1,
            userTrialQuotaLedger: {
              $filter: {
                input: "$userTrialQuotaLedger",
                cond: { $eq: ["$$this.status", "active"] },
              },
            },
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);

      const activeLedger = franchiseDetail[0]?.userTrialQuotaLedger[0];

      if (!activeLedger) {
        throw new CustomError(400, "No active trial quota ledger found");
      }

      const campaign = await CampaignModel.findById(
        activeLedger.sourceCampaignId
      );

      if (!campaign) {
        throw new CustomError(400, "Campaign not found");
      }
      if (campaign.status === "inactive") {
        await InvitationCodeModel.updateMany(
          { sourceCampaignId: campaign._id },
          { $set: { status: "inactive" } }
        );
        console.log("[InvitationCodeService] Campaign is inactive");
        throw new CustomError(400, "Campaign is inactive");
      }
      const packageId = campaign.packageId;

      const activeCode = await InvitationCodeModel.updateMany(
        { userId: userId },
        {
          status: "active",
          currentActiveLedgerEntryId: activeLedger._id, // Sử dụng _id từ activeLedger
          packageId,
        }
      );

      if (activeCode.modifiedCount === 0) {
        throw new CustomError(400, "Cannot activate invitation code");
      }
      return activeCode;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }
}

export default new InvitationCodeService();
