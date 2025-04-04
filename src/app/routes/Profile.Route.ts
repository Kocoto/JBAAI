import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";
import ProfileController from "../controllers/Profile.Controller";

const router = Router();

router.post("/update", checkLogin, ProfileController.updateProfile);
router.post("/", checkLogin, ProfileController.getProfile);

export default router;
