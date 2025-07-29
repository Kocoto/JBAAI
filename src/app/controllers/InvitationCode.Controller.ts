import InvitationCodeService from "../services/InvitationCode.Service";
import CustomError from "../utils/Error.Util";

class InvitationCodeController {
  async getCodeByUserId(req: any, res: any, next: any) {
    try {
      const userId = req.user._id;
      if (!userId) {
        throw new CustomError(400, "Unable to authenticate user");
      }
      const code = await InvitationCodeService.getCodeByUserId(userId);
      res.status(200).json({
        success: true,
        data: code,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new InvitationCodeController();
