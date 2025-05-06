import InvitationCodeModel from "../models/InvitationCode.Model";
import CustomError from "../utils/Error.Util";
import { generateInviteCode } from "../utils/OTP.Util";

class InvitationCodeService {
  async createInvitationCode(userId: string) {
    try {
      let code = generateInviteCode();
      let checkCode = await InvitationCodeModel.findOne({ code: code });
      while (checkCode) {
        code = generateInviteCode();
        checkCode = await InvitationCodeModel.findOne({ code: code });
        if (!checkCode) break;
      }
      const newCode = new InvitationCodeModel({ code: code, userId: userId });
      await newCode.save();
      return code;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, error as string);
    }
  }
  async checkCode(code: string) {
    try {
      const checkCode = await InvitationCodeModel.findOne({ code: code });
      const codeSplit = code.slice(-6);
      if (!checkCode && codeSplit !== "FREE15") {
        throw new CustomError(400, "Mã mời không hợp lệ");
      }
      return checkCode;
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
}

export default new InvitationCodeService();
