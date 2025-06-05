import ReportController from "../controllers/Report.Controller";
import { Router } from "express";

const router = Router();

router.get("/revenue", ReportController.exportRevenueReport);

export default router;
