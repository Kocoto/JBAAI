import * as winston from "winston";

const bold = (text: string) => `\x1b[1m${text}\x1b[22m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[39m`;

const logFormat = winston.format.printf(({ timestamp, level, message }) => {
  const styledTimestamp = bold(cyan(`[${timestamp}]`));
  return `${styledTimestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat
      ),
    }),
    new winston.transports.File({
      filename: "error.log",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] ${level}: ${message}`;
        })
      ),
    }),
  ],
});

export default logger;
