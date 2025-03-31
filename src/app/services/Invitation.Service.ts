import InvitationModel from "../models/Invitation.Model";
import InvitationCodeModel from "../models/InvitationCode.Model";
import CustomError from "../utils/Error.Util";

class InvitationService {
  async createInvitation(code: string, invitedUserId: string) {
    const inviter = await InvitationCodeModel.findOne({ code });
    if (!inviter) {
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
  }
}
export default new InvitationService();
