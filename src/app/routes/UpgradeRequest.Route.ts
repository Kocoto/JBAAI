import UpgradeRequestController from "../controllers/UpgradeRequest.Controller";
import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";

const router = Router();

router.use(checkLogin);

router.post("/", UpgradeRequestController.createUpgradeRequest);

export default router;
