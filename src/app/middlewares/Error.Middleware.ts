import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import CustomError from "../utils/Error.Util";
import logger from "../utils/Logger.Util";

const errorHandler: ErrorRequestHandler = (
  err,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // logger.error(err.stack);
  const statusCode = err instanceof CustomError ? err.status : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message, // Error message in English
    // data: err instanceof CustomError ? err.data : null,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export default errorHandler;
