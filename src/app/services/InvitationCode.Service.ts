import InvitationCodeModel from "../models/InvitationCode.Model";
import CustomError from "../utils/Error.Util";
import { generateInviteCode } from "../utils/OTP.Util";

class InvitationCodeService {
  async createInvitationCode(userId: string, code: string) {
    try {
      const newCode = InvitationCodeModel.create({
        code: code,
        userId: userId,
      });
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
}

export default new InvitationCodeService();
