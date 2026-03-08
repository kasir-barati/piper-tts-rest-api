// @ts-check

// Application configuration values sourced from environment variables.

export const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
/**
 * @description Maximum number of concurrent text-to-speech requests
 * @default 10
 */
export const MAX_CONCURRENCY = Number.parseInt(
  process.env.MAX_CONCURRENCY ?? "10",
  10,
);
/** @description Path to the Piper model file */
export const PIPER_MODEL_PATH =
  process.env.PIPER_MODEL ?? "/app/models/en_US-lessac-medium.onnx";

/**
 * @description Maximum allowed request body size is 1MB, which is sufficient for at least ~150000 words which is more than enough for typical use cases.
 * @default 1_000_000
 */
export const MAX_BODY_SIZE_BYTES = 1_000_000;

/**
 * @description Logging mode: PLAIN_TEXT for human-readable logs, JSON for structured logs
 * @default 'PLAIN_TEXT'
 */
export const LOGGING_MODE =
  /** @type {import('../utils/logger.js').LogMode} */ (
    process.env.LOGGING_MODE ?? "PLAIN_TEXT"
  );

/**
 * @description Logging level: error, warn, info, debug, verbose
 * @default 'info'
 */
export const LOGGING_LEVEL =
  /** @type {import('../utils/logger.js').LogLevel} */ (
    process.env.LOGGING_LEVEL ?? "info"
  );

/**
 * @description Service name for logging
 * @default 'piper-tts-rest-api'
 */
export const SERVICE_NAME = process.env.SERVICE_NAME ?? "piper-tts-rest-api";
