import ReportController from "../controllers/Report.Controller";
import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";

const router = Router();

router.get("/revenue", ReportController.exportRevenueReport);
router.get("/test", checkLogin, ReportController.test);

export default router;
