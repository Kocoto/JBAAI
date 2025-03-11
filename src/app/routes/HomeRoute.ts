import HomeController from "../controllers/HomeController";
import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";
const router = Router();

router.get("/", checkLogin, HomeController.index);

module.exports = router;
