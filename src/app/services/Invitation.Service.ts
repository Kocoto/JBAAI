import InvitationModel from "../models/Invitation.Model";
import InvitationCodeModel from "../models/InvitationCode.Model";
import CustomError from "../utils/Error.Util";

class InvitationService {
  async createInvitation(code: string, invitedUserId: string) {
    try {
      const inviter = await InvitationCodeModel.findOne({ code });
      const codeSplit = code.slice(-6);
      if (!inviter) {
        if (codeSplit !== "FREE15") {
          return true;
        }
        throw new CustomError(400, "Lỗi khi xác thực mã mời");
      }
      const inviterUserId = inviter.userId;
      const invitationCodeId = inviter._id;
      const invitation = await InvitationModel.create({
        inviterUserId,
        invitationCodeId,
        invitedUserId,
      });
      return invitation;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, error as string);
    }
  }
}
export default new InvitationService();
