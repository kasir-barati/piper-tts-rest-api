import type { Logger as WinstonLogger } from "winston";

import {
  createLogger as createWinstonLogger,
  format,
  transports,
} from "winston";

export type LogLevel = "error" | "warn" | "info" | "debug" | "verbose";
export type LogMode = "PLAIN_TEXT" | "JSON";
export interface LogMetadata {
  context?: string;
  [key: string]: unknown;
}

/**
 * @description Custom printf used in `PLAIN_TEXT` mode. Mirrors the format previously hand-rolled in this file so existing log-scraping / eyeballing habits still work.
 */
const plainTextFormat = format.printf((info) => {
  const {
    timestamp,
    message,
    service,
    context,
    // Winston injects these symbol-keyed fields; pull them out so they don't pollute the trailing JSON blob.
    [Symbol.for("level")]: _splatLevel,
    [Symbol.for("message")]: _splatMessage,
    [Symbol.for("splat")]: _splat,
    level: _level,
    ...extraData
  } = info;
  const contextPart =
    typeof context === "string" ? context.padEnd(20) : "".padEnd(20);
  const servicePart = service ? `[${String(service)}]` : "";

  let line = `[${timestamp}]     ${contextPart} ${servicePart} ${String(
    message,
  )}`;

  if (Object.keys(extraData).length > 0) {
    line += ` | ${JSON.stringify(extraData)}`;
  }

  return line;
});

/**
 * @description Lightweight facade over a winston logger.
 */
export class Logger {
  readonly #logger: WinstonLogger;
  readonly #serviceName: string;

  constructor(level: LogLevel, mode: LogMode, serviceName: string) {
    this.#serviceName = serviceName;
    this.#logger = createWinstonLogger({
      level: level,
      defaultMeta: { service: serviceName },
      format:
        mode === "JSON"
          ? format.combine(format.timestamp(), format.json())
          : format.combine(format.timestamp(), plainTextFormat),
      transports: [new transports.Console()],
    });
  }

  error(message: string, metadata: LogMetadata = {}): void {
    this.#logger.error(message, metadata);
  }

  warn(message: string, metadata: LogMetadata = {}): void {
    this.#logger.warn(message, metadata);
  }

  info(message: string, metadata: LogMetadata = {}): void {
    this.#logger.info(message, metadata);
  }

  debug(message: string, metadata: LogMetadata = {}): void {
    this.#logger.debug(message, metadata);
  }

  verbose(message: string, metadata: LogMetadata = {}): void {
    this.#logger.verbose(message, metadata);
  }

  /**
   * @internal Exposed for tests / advanced consumers that need the underlying winston instance (e.g. to attach extra transports).
   */
  get raw(): WinstonLogger {
    return this.#logger;
  }

  get serviceName(): string {
    return this.#serviceName;
  }
}

/**
 * @summary creates a logger instance.
 *
 * ## ⚠️ Do NOT import this module from `src/instrumentation.ts`
 */
export function createLogger(
  level: LogLevel,
  mode: LogMode,
  serviceName: string,
): Logger {
  return new Logger(level, mode, serviceName);
}
