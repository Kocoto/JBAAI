import { Router } from "express";
import AdminController from "../controllers/Admin.Controller";
import { checkLogin, checkAdmin } from "../middlewares/Auth.Middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(checkLogin);
router.use(checkAdmin);

// Campaign management routes
router.post("/campaigns", AdminController.createCampaign);
router.get("/campaigns", AdminController.getAllCampaigns);
router.get("/campaigns/statistics", AdminController.getCampaignStatistics);
router.get("/campaigns/:campaignId", AdminController.getCampaignById);
router.put("/campaigns/:campaignId", AdminController.updateCampaign);
router.delete("/campaigns/:campaignId", AdminController.deleteCampaign);
router.patch(
  "/campaigns/:campaignId/status",
  AdminController.changeCampaignStatus
);
router.get(
  "/campaigns/:campaignId/performance-summary",
  AdminController.getCampaignPerformanceSummary
);

// Franchise management routes
router.get("/franchises", AdminController.getAllFranchises);
router.get(
  "/franchises/:userId/hierarchy",
  AdminController.getFranchiseHierarchy
);
router.get(
  "/franchises/:userId/performance-overview",
  AdminController.getFranchisePerformanceOverview
);

router.post("/invitation-code/create", AdminController.createInvitationCode);
router.get("/users/search", AdminController.getSearchUsers);
router.get("/users", AdminController.getAllUsers);
router.get("/users/:userId", AdminController.getUserById);
router.put("/users/:userId", AdminController.updateUser);
router.delete("/users/:userId", AdminController.deleteUser);

export default router;
