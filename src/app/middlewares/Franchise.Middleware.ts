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
      throw new CustomError(401, "Please login to continue");
    }

    // Kiểm tra role
    if (req.user.role !== "franchise") {
      throw new CustomError(
        403,
        "You don't have permission to access this feature. Franchise only"
      );
    }

    // Kiểm tra trạng thái tài khoản
    if (req.user.status !== "active") {
      throw new CustomError(
        403,
        "Your account has been locked or not activated"
      );
    }

    // Kiểm tra xem có franchiseName không (đảm bảo là franchise đã được approve)
    if (!req.user.franchiseName) {
      throw new CustomError(
        403,
        "Your franchise account has not been verified. Please contact admin"
      );
    }

    console.log(
      `[FranchiseMiddleware] Franchise ${req.user.franchiseName} (${req.user._id}) has been authenticated`
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
      throw new CustomError(401, "Please login to continue");
    }

    // Kiểm tra role
    if (req.user.role !== "franchise" && req.user.role !== "admin") {
      throw new CustomError(
        403,
        "You don't have permission to access this feature"
      );
    }

    // Kiểm tra trạng thái tài khoản
    if (req.user.status !== "active") {
      throw new CustomError(
        403,
        "Your account has been locked or not activated"
      );
    }

    // Nếu là franchise, kiểm tra franchiseName
    if (req.user.role === "franchise" && !req.user.franchiseName) {
      throw new CustomError(
        403,
        "Your franchise account has not been verified"
      );
    }

    console.log(
      `[FranchiseMiddleware] User ${req.user._id} (role: ${req.user.role}) has been authenticated`
    );

    next();
  } catch (error) {
    next(error);
  }
};
