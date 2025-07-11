import HealthDataController from "../controllers/HealthData.Controller";
import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";

const router = Router();

router.use(checkLogin);
router.post(
  "/get-health-data-by-range",
  HealthDataController.getHealthDataByDateRange
);
// router.get("/monthly-report", HealthDataController.exportMonthlyReport);
router.post("/sent-mail", HealthDataController.senMailHealthData);
router.post("/update", HealthDataController.createHealthData);
router.post(
  "/trigger-report",
  HealthDataController.triggerMonthlyReportGeneration
);
router.post("/delete", HealthDataController.deleteHealthData);
router.post("/", HealthDataController.getHealthDataByDate);

export default router;
