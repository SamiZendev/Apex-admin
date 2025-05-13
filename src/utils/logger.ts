import fs from "fs";
import path from "path";

export const logErrorToFile = (error: any, context: string = "") => {
  const logDir = path.resolve(__dirname, "../../logs");
  const logFilePath = path.join(logDir, "error.log");

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] [${context}] ${formatError(error)}\n`;

  fs.appendFileSync(logFilePath, message, "utf8");
};

const formatError = (error: any): string => {
  if (error instanceof Error) {
    return `${error.message}\n${error.stack}`;
  }
  if (typeof error === "object") {
    return JSON.stringify(error, null, 2);
  }
  return String(error);
};
