import { Router } from "express";
import AuthControllers from "../controllers/Auth.Controller";
import { checkLogin } from "../middlewares/Auth.Middleware";

const router = Router();

router.post("/change-password", checkLogin, AuthControllers.changePassword);
router.post("/verify-otp-to-reset-password", AuthControllers.verifyOTP);
router.post("/verify-otp-to-login", AuthControllers.verifyOTPtoLogin);
router.post("/reset-password", AuthControllers.resetPassword);
router.post("/refresh-token", AuthControllers.refreshToken);
router.post("/register", AuthControllers.register);
router.post("/resend-otp", AuthControllers.getOTP);
router.post("/logout", AuthControllers.logout);
router.post("/login", AuthControllers.login);

export default router;
