import UserController from "../controllers/User.Controller";
import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";
const router = Router();

router.use(checkLogin);
router.get("/test", UserController.updateManyUser);
router.post("/switch-notification", UserController.swtichNotification);
router.post("/change-language", UserController.changeLanguage);

export default router;
