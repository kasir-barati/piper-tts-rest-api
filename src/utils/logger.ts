export type LogLevel = "error" | "warn" | "info" | "debug" | "verbose";
export type LogMode = "PLAIN_TEXT" | "JSON";
export interface LogMetadata {
  context?: string;
  correlationId?: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4,
};

/**
 * Lightweight logger class that supports different log levels and output modes.
 */
export class Logger {
  #currentLevel: number;
  #mode: LogMode;
  #serviceName: string;

  constructor(level: LogLevel, mode: LogMode, serviceName: string) {
    this.#currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
    this.#mode = mode;
    this.#serviceName = serviceName;
  }

  error(message: string, metadata: LogMetadata = {}): void {
    this.#log("error", message, metadata, console.error);
  }

  warn(message: string, metadata: LogMetadata = {}): void {
    this.#log("warn", message, metadata, console.warn);
  }

  info(message: string, metadata: LogMetadata = {}): void {
    this.#log("info", message, metadata, console.info);
  }

  debug(message: string, metadata: LogMetadata = {}): void {
    this.#log("debug", message, metadata, console.debug);
  }

  verbose(message: string, metadata: LogMetadata = {}): void {
    this.#log("verbose", message, metadata, console.log);
  }

  #log(
    level: LogLevel,
    message: string,
    metadata: LogMetadata,
    consoleFn: (...args: unknown[]) => void,
  ): void {
    if (LOG_LEVELS[level] > this.#currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const { context, correlationId, ...extraData } = metadata;

    if (this.#mode === "JSON") {
      const logEntry = {
        timestamp,
        level,
        service: this.#serviceName,
        message,
        ...(context && { context }),
        ...(correlationId && { correlationId }),
        ...extraData,
      };
      consoleFn(JSON.stringify(logEntry));
    } else {
      // PLAIN_TEXT mode
      const contextPart = context ? `${context.padEnd(20)}` : "".padEnd(20);
      const servicePart = `[${this.#serviceName}]`;
      const correlationPart = correlationId
        ? ` (correlationId: ${correlationId})`
        : "";

      let logMessage = `[${timestamp}]     ${contextPart} ${servicePart}${correlationPart} ${message}`;

      // Append extra metadata if present
      if (Object.keys(extraData).length > 0) {
        const extraDataStr = JSON.stringify(extraData);
        logMessage += ` | ${extraDataStr}`;
      }

      consoleFn(logMessage);
    }
  }
}

export function createLogger(
  level: LogLevel,
  mode: LogMode,
  serviceName: string,
): Logger {
  return new Logger(level, mode, serviceName);
}
