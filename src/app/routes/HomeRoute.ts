import HomeController from "../controllers/HomeController";
import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";
const router = Router();

router.post("/hide-score", HomeController.hideScore);
router.get("/check", checkLogin, HomeController.test);
router.get("/success", HomeController.paymentSuccess);
router.get("/cancel", HomeController.paymentCancel);
router.get("/", HomeController.index);

module.exports = router;
