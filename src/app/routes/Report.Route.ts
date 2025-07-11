import ReportController from "../controllers/Report.Controller";
import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";

const router = Router();

router.get("/revenue", ReportController.exportRevenueReport);

export default router;
