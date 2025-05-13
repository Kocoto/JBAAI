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
      expiresIn: "1d",
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
      expiresIn: "8d",
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

export const verifyTokenToLogout = (
  token: string,
  isRefreshToken: boolean = false
): TokenPayload => {
  if (!token) {
    throw new CustomError(401, "Không tìm thấy token");
  }

  // Bước 1: Decode token để lấy payload mà không cần xác thực chữ ký hay hạn sử dụng
  const decodedPayload = jwt.decode(token) as TokenPayload | null;

  // Kiểm tra payload cơ bản sau khi decode
  if (!decodedPayload || !decodedPayload.userId || !decodedPayload.clientId) {
    // Nếu không decode được hoặc thiếu thông tin cơ bản, coi như token không hợp lệ
    throw new CustomError(
      401,
      "Token không hợp lệ hoặc không chứa đủ thông tin"
    );
  }

  try {
    // Bước 2: Xác thực chữ ký token (vẫn cần thiết)
    const secret = isRefreshToken
      ? process.env.REFRESH_TOKEN_SECRET
      : process.env.ACCESS_TOKEN_SECRET;

    if (!secret) {
      throw new CustomError(500, "Chưa cấu hình token secret");
    }

    // Verify chữ ký, nhưng sẽ bắt lỗi hết hạn ở dưới
    jwt.verify(token, secret);

    // Nếu verify thành công (không hết hạn, chữ ký đúng), trả về payload đã decode
    return decodedPayload;
  } catch (error) {
    // Bước 3: Xử lý lỗi từ jwt.verify
    if (error instanceof jwt.TokenExpiredError) {
      // Nếu lỗi là do hết hạn, ta chấp nhận và vẫn trả về payload đã decode ở Bước 1
      // Vì mục đích là logout, ta vẫn cần thông tin user/client từ token hết hạn
      console.warn(
        `[verifyTokenToLogout] Token đã hết hạn nhưng vẫn được chấp nhận để logout. UserID: ${decodedPayload.userId}`
      );
      return decodedPayload;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      // Nếu lỗi là do chữ ký sai hoặc token không hợp lệ
      throw new CustomError(
        401,
        "Token không hợp lệ (sai chữ ký hoặc định dạng)"
      );
    }
    if (error instanceof CustomError) {
      // Ném lại các lỗi CustomError đã biết
      throw error;
    }
    // Các lỗi không mong muốn khác
    console.error("Lỗi không xác định khi xác thực token để logout:", error);
    throw new CustomError(500, "Lỗi xác thực token khi đăng xuất");
  }
};
