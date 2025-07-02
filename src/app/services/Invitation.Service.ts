import { FranchiseDetailsModel } from "../models/FranchiseDetails.Model";
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
      let invitation;
      const invitationCode = await InvitationCodeModel.findOne({
        code,
      }).session(session || null);
      if (!invitationCode) {
        throw new CustomError(400, "Lỗi khi xác thực mã mời");
      }

      const franchise = await FranchiseDetailsModel.findOne({
        userId: invitationCode.userId,
        "userTrialQuotaLedger._id": invitationCode.currentActiveLedgerEntryId,
      }).session(session || null);
      if (invitationCode.codeType === "USER_TRIAL" && !franchise) {
        invitation = await InvitationModel.create(
          [
            {
              inviterUserId: invitationCode.userId,
              invitationCodeId: invitationCode._id,
              invitedUserId,
              inviteType: "USER_TRIAL",
            },
          ],
          { session: session || null }
        );
      }

      const inviterUserId = invitationCode.userId;
      const invitationCodeId = invitationCode._id;
      invitation = await InvitationModel.create(
        [
          {
            inviterUserId,
            invitationCodeId,
            invitedUserId,
            inviteType: "FRANCHISE_HIERARCHY",
            linkedLedgerEntryId: invitationCode.currentActiveLedgerEntryId,
            linkedRootCampaignId:
              franchise?.userTrialQuotaLedger[0]?.sourceCampaignId,
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
