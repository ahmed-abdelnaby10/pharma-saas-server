import { appConfig } from "../config/app.config";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minimumLevel = appConfig.logLevel;

const formatArg = (arg: unknown): unknown => {
  if (arg instanceof Error) {
    return {
      name: arg.name,
      message: arg.message,
      stack: arg.stack,
    };
  }

  return arg;
};

const write = (level: LogLevel, args: unknown[]) => {
  if (levelWeight[level] < levelWeight[minimumLevel]) {
    return;
  }

  const method =
    level === "debug"
      ? console.debug
      : level === "info"
        ? console.info
        : level === "warn"
          ? console.warn
          : console.error;

  method(
    `[${new Date().toISOString()}] [${level.toUpperCase()}]`,
    ...args.map(formatArg),
  );
};

export const logger = {
  debug: (...args: unknown[]) => write("debug", args),
  info: (...args: unknown[]) => write("info", args),
  warn: (...args: unknown[]) => write("warn", args),
  error: (...args: unknown[]) => write("error", args),
};
