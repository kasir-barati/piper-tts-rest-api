import type { LogLevel, LogMode } from "./utils/index.js";

/**
 * Application configuration values sourced from environment variables.
 */
export const config = {
  /** Service configuration. */
  service: {
    /** Port the HTTP server listens on. */
    port: Number.parseInt(process.env.PORT ?? "3000", 10),

    /**
     * Service name for logging.
     * @default 'piper-tts-rest-api'
     */
    name: process.env.SERVICE_NAME ?? "piper-tts-rest-api",
  },

  /**
   * Maximum number of concurrent text-to-speech requests.
   * @default 10
   */
  maxConcurrency: Number.parseInt(process.env.MAX_CONCURRENCY ?? "10", 10),

  /** Path to the Piper model file. */
  piperModelPath:
    process.env.PIPER_MODEL ?? "/app/models/en_US-lessac-medium.onnx",

  /**
   * Maximum allowed request body size is 1MB, which is sufficient for at least
   * ~150 000 words — more than enough for typical use cases.
   * @default 1_000_000
   */
  maxBodySizeBytes: 1_000_000,

  /** Logging configuration. */
  log: {
    /**
     * Logging mode: PLAIN_TEXT for human-readable logs, JSON for structured logs.
     * @default 'PLAIN_TEXT'
     */
    mode: ((process.env.LOGGING_MODE as LogMode | undefined) ??
      "PLAIN_TEXT") as LogMode,

    /**
     * Logging level: error, warn, info, debug, verbose.
     * @default 'info'
     */
    level: ((process.env.LOGGING_LEVEL as LogLevel | undefined) ??
      "info") as LogLevel,
  },
} as const;
