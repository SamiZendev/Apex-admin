import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

const prettyJsonFormat = winston.format.printf((info) => {
  const { timestamp, level, message, ...rest } = info;
  return JSON.stringify(
    {
      timestamp,
      level,
      message,
      ...rest,
    },
    null,
    2
  );
});

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.timestamp(), prettyJsonFormat),
  transports: [
    new DailyRotateFile({
      dirname: "logs/info",
      filename: "%DATE%-info.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      zippedArchive: true,
      level: "info",
    }),
    new DailyRotateFile({
      dirname: "logs/error",
      filename: "%DATE%-error.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      zippedArchive: true,
      level: "error",
    }),
  ],
});
