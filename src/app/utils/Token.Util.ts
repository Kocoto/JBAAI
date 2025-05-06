import * as jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";
import CustomError from "./Error.Util";

export interface TokenPayload extends JwtPayload {
  userId: string;
  clientId: string;
}

export const accessTokenGenerator = (
  userId: string,
  clientId: string
): string => {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new CustomError(500, "Chưa cấu hình ACCESS_TOKEN_SECRET");
  }

  try {
    return jwt.sign({ userId, clientId }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1m",
    });
  } catch (error) {
    console.error("Lỗi tạo access token:", error);
    throw new CustomError(500, "Lỗi khi tạo access token");
  }
};

export const refreshTokenGenerator = (
  userId: string,
  clientId: string
): string => {
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new CustomError(500, "Chưa cấu hình REFRESH_TOKEN_SECRET");
  }

  try {
    return jwt.sign({ userId, clientId }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "1m",
    });
  } catch (error) {
    console.error("Lỗi tạo refresh token:", error);
    throw new CustomError(500, "Lỗi khi tạo refresh token");
  }
};

export const verifyToken = (
  token: string,
  isRefreshToken: boolean = false
): TokenPayload => {
  if (!token) {
    throw new CustomError(401, "Không tìm thấy token");
  }

  try {
    const secret = isRefreshToken
      ? process.env.REFRESH_TOKEN_SECRET
      : process.env.ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new CustomError(500, "Chưa cấu hình token secret");
    }

    const decoded = jwt.verify(token, secret) as TokenPayload;

    if (!decoded.userId || !decoded.clientId) {
      throw new CustomError(401, "Token không hợp lệ");
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new CustomError(401, "Token đã hết hạn");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new CustomError(401, "Token không hợp lệ");
    }
    if (error instanceof CustomError) {
      throw error;
    }
    throw new CustomError(500, "Lỗi xác thực token");
  }
};
