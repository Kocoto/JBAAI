import PaypalController from "../controllers/Paypal.Controller";
import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";

const router = Router();

router.use(checkLogin);
router.post("/create-order", PaypalController.createOrder);
router.post("/capture-order", PaypalController.captureOrder);

export default router;
