import { Request, Response, NextFunction } from "express";
import CustomError from "../utils/Error.Util";
import { verifyToken, TokenPayload } from "../utils/Token.Util";
import UserModel from "../models/User.Model";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const checkLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (req.headers) {
    }
    if (!authHeader) {
      throw new CustomError(401, "Authorization header không tồn tại");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new CustomError(401, "Token không tồn tại");
    }

    const decoded = verifyToken(token) as TokenPayload;

    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      throw new CustomError(401, "Token đã hết hạn");
    }

    const user = await UserModel.findById(decoded.userId).select("-password");
    if (!user) {
      throw new CustomError(401, "User không tồn tại");
    }

    if (user.verify == false) {
      throw new CustomError(403, "Người dùng cần xác minh tài khoản trước");
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};
