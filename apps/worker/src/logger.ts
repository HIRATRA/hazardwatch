import { pino, type Logger } from "pino";

import type { Config } from "./config.js";

export type { Logger };

export function createLogger(config: Pick<Config, "LOG_LEVEL" | "NODE_ENV">): Logger {
  return pino({
    level: config.LOG_LEVEL,
    base: { service: "worker" },
    // Human-readable output locally, structured JSON everywhere else.
    ...(config.NODE_ENV === "development" && {
      transport: { target: "pino-pretty", options: { colorize: true } },
    }),
  });
}
