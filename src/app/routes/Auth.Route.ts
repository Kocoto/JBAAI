import { Router } from "express";
import AuthControllers from "../controllers/Auth.Controller";
import { checkLogin } from "../middlewares/Auth.Middleware";

const router = Router();

router.post("/refresh-token", AuthControllers.refreshToken);
router.post("/logout", checkLogin, AuthControllers.logout);
router.post("/verify-otp", AuthControllers.verifyOTP);
router.post("/register", AuthControllers.register);
router.post("/login", AuthControllers.login);

export default router;
