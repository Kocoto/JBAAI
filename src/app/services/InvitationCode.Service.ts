import InvitationCodeModel from "../models/InvitationCode.Model";
import CustomError from "../utils/Error.Util";
import { generateInviteCode } from "../utils/OTP.Util";

class InvitationCodeService {
  async createInvitationCode(userId: string) {
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
  }
  async checkCode(code: string) {
    const checkCode = await InvitationCodeModel.findOne({ code: code });
    if (!checkCode) {
      throw new CustomError(400, "Mã mời không hợp lệ");
    }
    return checkCode;
  }
}

export default new InvitationCodeService();
