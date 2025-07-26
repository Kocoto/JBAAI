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

    // Lỗi sẽ được ném thẳng ra ngoài để withTransaction ở hàm cha xử lý
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
        throw new CustomError(400, "Mã mời không hợp lệ");
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
        throw new CustomError(400, "Mã mời đã tồn tại");
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
    currentActiveLedgerEntryId: string
  ) {
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
                cond: { $eq: ["$$this._id", currentActiveLedgerEntryId] },
              },
            },
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ]);

      const activeLedger = franchiseDetail[0]?.userTrialQuotaLedger[0];

      const campaign = await CampaignModel.findById(
        activeLedger.sourceCampaignId
      );

      if (!campaign) {
        throw new CustomError(400, "Không tìm thấy chiến dịch");
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
        throw new CustomError(400, "Không thể kích hoạt mã mời");
      }
      return activeCode;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }
}

export default new InvitationCodeService();
