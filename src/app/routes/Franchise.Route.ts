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

export default router;
