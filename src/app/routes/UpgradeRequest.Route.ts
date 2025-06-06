import UpgradeRequestController from "../controllers/UpgradeRequest.Controller";
import { Router } from "express";
import { checkLogin } from "../middlewares/Auth.Middleware";

const router = Router();

router.use(checkLogin);

router.post(
  "/:requestId/approve",
  UpgradeRequestController.approveUpgradeRequest
);
router.get(
  "/get-by-seller-id/:status",
  UpgradeRequestController.getUpgradeRequestBySellerId
);
router.put(
  "/:requestId/assign-seller",
  UpgradeRequestController.acceptUpgradeRequest
);
router.get(
  "/get-by-status/:status",
  UpgradeRequestController.getUpgradeRequestsByStatus
);
router.post("/", UpgradeRequestController.createUpgradeRequest);

export default router;
