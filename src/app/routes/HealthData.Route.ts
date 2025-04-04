import HealthDataController from "../controllers/HealthData.Controller";
import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";

const router = Router();

router.use(checkLogin);
router.post("/update", HealthDataController.createHealthData);
router.post("/delete", HealthDataController.deleteHealthData);
router.post("/", HealthDataController.getHealthDataByDate);

export default router;
