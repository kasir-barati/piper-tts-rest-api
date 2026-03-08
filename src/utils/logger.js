// @ts-check

/**
 * @typedef {'error' | 'warn' | 'info' | 'debug' | 'verbose'} LogLevel
 * @typedef {'PLAIN_TEXT' | 'JSON'} LogMode
 * @typedef {{ context?: string, correlationId?: string } & Record<string, any>} LogMetadata
 */

const LOG_LEVELS = {
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
  /** @type {number} */
  #currentLevel;
  /** @type {LogMode} */
  #mode;
  /** @type {string} */
  #serviceName;

  /**
   * Creates a new Logger instance.
   * @param {LogLevel} level - The logging level
   * @param {LogMode} mode - The output mode (PLAIN_TEXT or JSON)
   * @param {string} serviceName - The name of the service
   */
  constructor(level, mode, serviceName) {
    this.#currentLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
    this.#mode = mode;
    this.#serviceName = serviceName;
  }

  /**
   * Logs an error message.
   * @param {string} message - The log message
   * @param {LogMetadata} [metadata] - Additional metadata
   */
  error(message, metadata = {}) {
    this.#log("error", message, metadata, console.error);
  }

  /**
   * Logs a warning message.
   * @param {string} message - The log message
   * @param {LogMetadata} [metadata] - Additional metadata
   */
  warn(message, metadata = {}) {
    this.#log("warn", message, metadata, console.warn);
  }

  /**
   * Logs an info message.
   * @param {string} message - The log message
   * @param {LogMetadata} [metadata] - Additional metadata
   */
  info(message, metadata = {}) {
    this.#log("info", message, metadata, console.info);
  }

  /**
   * Logs a debug message.
   * @param {string} message - The log message
   * @param {LogMetadata} [metadata] - Additional metadata
   */
  debug(message, metadata = {}) {
    this.#log("debug", message, metadata, console.debug);
  }

  /**
   * Logs a verbose message.
   * @param {string} message - The log message
   * @param {LogMetadata} [metadata] - Additional metadata
   */
  verbose(message, metadata = {}) {
    this.#log("verbose", message, metadata, console.log);
  }

  /**
   * Internal logging method.
   * @param {LogLevel} level - The log level
   * @param {string} message - The log message
   * @param {LogMetadata} metadata - Additional metadata
   * @param {Function} consoleFn - The console function to use
   */
  #log(level, message, metadata, consoleFn) {
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

/**
 * @description Creates a logger instance.
 * @param {LogLevel} level - The logging level
 * @param {LogMode} mode - The output mode
 * @param {string} serviceName - The service name
 * @returns {Logger}
 */
export function createLogger(level, mode, serviceName) {
  return new Logger(level, mode, serviceName);
}
