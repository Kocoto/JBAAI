import { ClientSession } from "mongoose";
import mongoose from "mongoose";
import InvitationCodeModel from "../models/InvitationCode.Model";
import CustomError from "../utils/Error.Util";
import { generateInviteCode, generateOTP } from "../utils/OTP.Util";
import CampaignModel from "../models/Campaign.Model";

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

    // You can keep this log for debugging, but understand it's just "temporary success"
    console.log(`Added code ${validCode} to transaction.`);

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
      const code = await InvitationCodeModel.findOne({ userId: userId });
      return code;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }

  async activeInvitationCode(
    userId: string,
    currentActiveLedgerEntryId: string,
    sourceCampaignId: string
  ) {
    try {
      const campaign = await CampaignModel.findById(sourceCampaignId);
      if (!campaign) {
        throw new CustomError(400, "Campaign not found");
      }

      const packageId = campaign.packageId;

      const activeCode = await InvitationCodeModel.updateMany(
        { userId: userId },
        {
          status: "active",
          currentActiveLedgerEntryId: currentActiveLedgerEntryId,
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
