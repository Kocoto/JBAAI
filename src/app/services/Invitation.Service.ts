import InvitationModel from "../models/Invitation.Model";
import InvitationCodeModel from "../models/InvitationCode.Model";
import CustomError from "../utils/Error.Util";
import { ClientSession } from "mongoose";

class InvitationService {
  async createInvitation(
    code: string,
    invitedUserId: string,
    session?: ClientSession
  ) {
    try {
      const inviter = await InvitationCodeModel.findOne({ code }).session(
        session || null
      );
      const codeSplit = code.slice(-6);
      console.log("codeSplit: ", codeSplit);
      if (!inviter) {
        if (codeSplit == "FREE25") {
          console.log("codeSplit: ", codeSplit);
          return true;
        }
        throw new CustomError(400, "Lỗi khi xác thực mã mời");
      }
      const inviterUserId = inviter.userId;
      const invitationCodeId = inviter._id;
      const invitation = await InvitationModel.create(
        [
          {
            inviterUserId,
            invitationCodeId,
            invitedUserId,
          },
        ],
        { session: session || null }
      );
      return invitation[0];
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }
}
export default new InvitationService();
