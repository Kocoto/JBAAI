import UserController from "../controllers/User.Controller";
import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";
const router = Router();

router.use(checkLogin);
router.post("/switch-notification", UserController.swtichNotification);
router.post("/change-language", UserController.changeLanguage);
router.post("/delete-account", UserController.deleteMyAccount);
router.get("/test", UserController.updateManyUser);

export default router;
