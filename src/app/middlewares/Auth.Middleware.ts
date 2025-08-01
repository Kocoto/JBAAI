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
    let authHeader;
    if (req.body.authorization) {
      authHeader = req.body.authorization;
      // console.log("Có token trong body");
    } else {
      authHeader = req.headers.authorization;
      // console.log("Có token trong header");
    }
    // const authHeader = req.body.authorization;
    if (!authHeader) {
      throw new CustomError(401, "Authorization header does not exist");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new CustomError(401, "Token does not exist");
    }

    const decoded = verifyToken(token) as TokenPayload;

    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      throw new CustomError(401, "Token has expired");
    }

    const user = await UserModel.findById(decoded.userId).select("-password");
    if (!user) {
      throw new CustomError(401, "User does not exist");
    }

    // if (user.verify == false) {
    //   throw new CustomError(403, "Người dùng cần xác minh tài khoản trước");
    // }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

export const checkAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to access this feature",
    });
  }
  next();
};
