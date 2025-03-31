import HomeController from "../controllers/HomeController";
import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";
const router = Router();

router.get("/", HomeController.index);
router.get("/check", checkLogin, HomeController.test);

module.exports = router;
