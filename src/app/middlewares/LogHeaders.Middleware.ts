import { Request, Response, NextFunction } from "express";

export const logAllHeadersMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("--- Headers từ Client ---");
  console.log(req.headers); // Đây chính là nơi bạn lấy được tất cả headers
  console.log("------------------------");
  next(); // Chuyển tiếp request đến handler tiếp theo
};
