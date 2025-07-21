import { Router } from "express";
import FranchiseController from "../controllers/Franchise.Controller";
import { checkLogin } from "../middlewares/Auth.Middleware";
import { checkFranchise } from "../middlewares/Franchise.Middleware";

const router = Router();

// Áp dụng middleware checkLogin cho tất cả routes
router.use(checkLogin);

// Routes dành riêng cho franchise
// GET /api/v1/franchise/me/details - Lấy thông tin FranchiseDetails của franchise đang đăng nhập
router.get(
  "/me/details",
  checkFranchise,
  FranchiseController.getMyFranchiseDetails
);

// GET /api/v1/franchise/me/quota - Lấy thông tin quota hiện tại
router.get("/me/quota", checkFranchise, FranchiseController.getMyQuota);

// GET /api/v1/franchise/me/statistics - Lấy thống kê hiệu suất
router.get(
  "/me/statistics",
  checkFranchise,
  FranchiseController.getMyStatistics
);

// GET /api/v1/franchise/me/invitation-codes - Lấy danh sách các mã mời
router.get(
  "/me/invitation-codes",
  checkFranchise,
  FranchiseController.getMyInvitationCodes
);

// GET /api/v1/franchise/me/user-trial-quota-ledger - Lấy danh sách quota ledger
router.get(
  "/me/user-trial-quota-ledger",
  checkFranchise,
  FranchiseController.getMyUserTrialQuotaLedger
);

// POST /api/v1/franchise/manage-children-quota/allocate - Cấp quota cho franchise con
router.post(
  "/manage-children-quota/allocate",
  checkFranchise,
  FranchiseController.allocateQuotaToChild
);

// PUT /api/v1/franchise/manage-children-quota/revoke-allocation/:childLedgerEntryId - Thu hồi quota
router.put(
  "/manage-children-quota/revoke-allocation/:childLedgerEntryId",
  checkFranchise,
  FranchiseController.revokeQuotaFromChild
);

// GET /api/v1/franchise/manage-children-quota/allocation-history/child/:childFranchiseUserId - Lịch sử cấp phát
router.get(
  "/manage-children-quota/allocation-history/child/:childFranchiseUserId",
  checkFranchise,
  FranchiseController.getChildAllocationHistory
);

// GET /api/v1/franchise/reports/my-trial-performance - Hiệu suất mời dùng thử của chính mình
router.get(
  "/reports/my-trial-performance",
  checkFranchise,
  FranchiseController.getMyTrialPerformance
);

// GET /api/v1/franchise/reports/children-trial-performance-summary - Hiệu suất tổng hợp franchise con
router.get(
  "/reports/children-trial-performance-summary",
  checkFranchise,
  FranchiseController.getChildrenTrialPerformanceSummary
);

// GET /api/v1/franchise/reports/child-trial-performance/:childFranchiseUserId - Hiệu suất chi tiết một franchise con
router.get(
  "/reports/child-trial-performance/:childFranchiseUserId",
  checkFranchise,
  FranchiseController.getSingleChildTrialPerformance
);

// GET /api/v1/franchise/reports/full-hierarchy-performance/:rootCampaignId? - Hiệu suất toàn bộ cây franchise
router.get(
  "/reports/full-hierarchy-performance/:rootCampaignId?",
  checkFranchise,
  FranchiseController.getFullHierarchyPerformance
);

// GET /api/v1/franchise/reports/full-hierarchy-performance - Hiệu suất toàn bộ cây franchise (không có rootCampaignId)
router.get(
  "/reports/full-hierarchy-performance",
  checkFranchise,
  FranchiseController.getFullHierarchyPerformance
);

// GET /api/v1/franchise/reports/quota-utilization - Tình hình sử dụng quota
router.get(
  "/reports/quota-utilization",
  checkFranchise,
  FranchiseController.getQuotaUtilization
);

// POST /api/v1/franchise/active-invitation-code - Kích hoạt mã mời
router.post(
  "/active-invitation-code",
  checkFranchise,
  FranchiseController.activeInvitationCode
);

export default router;
