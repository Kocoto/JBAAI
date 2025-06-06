import { Request, Response, NextFunction } from "express";
import CustomError from "../utils/Error.Util";

/**
 * Middleware kiểm tra user có phải là franchise không
 * Phải sử dụng sau middleware checkLogin
 */
export const checkFranchise = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Kiểm tra user đã đăng nhập chưa
    if (!req.user) {
      throw new CustomError(401, "Vui lòng đăng nhập để tiếp tục");
    }

    // Kiểm tra role
    if (req.user.role !== "franchise") {
      throw new CustomError(
        403,
        "Bạn không có quyền truy cập tính năng này. Chỉ dành cho franchise"
      );
    }

    // Kiểm tra trạng thái tài khoản
    if (req.user.status !== "active") {
      throw new CustomError(
        403,
        "Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt"
      );
    }

    // Kiểm tra xem có franchiseName không (đảm bảo là franchise đã được approve)
    if (!req.user.franchiseName) {
      throw new CustomError(
        403,
        "Tài khoản franchise của bạn chưa được xác nhận. Vui lòng liên hệ admin"
      );
    }

    console.log(
      `[FranchiseMiddleware] Franchise ${req.user.franchiseName} (${req.user._id}) đã được xác thực`
    );

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware kiểm tra user có phải là franchise hoặc admin không
 * Phải sử dụng sau middleware checkLogin
 */
export const checkFranchiseOrAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Kiểm tra user đã đăng nhập chưa
    if (!req.user) {
      throw new CustomError(401, "Vui lòng đăng nhập để tiếp tục");
    }

    // Kiểm tra role
    if (req.user.role !== "franchise" && req.user.role !== "admin") {
      throw new CustomError(403, "Bạn không có quyền truy cập tính năng này");
    }

    // Kiểm tra trạng thái tài khoản
    if (req.user.status !== "active") {
      throw new CustomError(
        403,
        "Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt"
      );
    }

    // Nếu là franchise, kiểm tra franchiseName
    if (req.user.role === "franchise" && !req.user.franchiseName) {
      throw new CustomError(
        403,
        "Tài khoản franchise của bạn chưa được xác nhận"
      );
    }

    console.log(
      `[FranchiseMiddleware] User ${req.user._id} (role: ${req.user.role}) đã được xác thực`
    );

    next();
  } catch (error) {
    next(error);
  }
};
