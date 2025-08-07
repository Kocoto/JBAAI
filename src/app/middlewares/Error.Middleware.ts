import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import CustomError from "../utils/Error.Util";
import logger from "../utils/Logger.Util";
import { translateTextSmart } from "../utils/Translate.Util";

const errorHandler: ErrorRequestHandler = async (
  err,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(err.stack);
  let translatedMessage = err.message;
  const statusCode = err instanceof CustomError ? err.status : 500;
  const acceptLang = req.headers["accept-language"]?.split(",")[0];

  if (err.errorEnabled && acceptLang && acceptLang !== "en") {
    translatedMessage = await translateTextSmart(err.message, acceptLang);
  }
  if (!err.errorEnabled) {
    translatedMessage = "An error occurred.";
  }
  console.log(`[ErrorMiddleware] Message: ${err.message}`);
  console.log(`[ErrorMiddleware] Stack: ${err.stack}`);
  res.status(statusCode).json({
    success: false,
    message: translatedMessage,
    stack:
      process.env.NODE_ENV === "production" || !err.errorEnabled
        ? null
        : err.stack,
  });
};

export default errorHandler;
