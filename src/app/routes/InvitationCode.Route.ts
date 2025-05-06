import InvitationCodeController from "../controllers/InvitationCode.Controller";
import { checkLogin } from "../middlewares/Auth.Middleware";
import { Router } from "express";

const router = Router();

router.get("/", checkLogin, InvitationCodeController.getCodeByUserId);

export default router;
