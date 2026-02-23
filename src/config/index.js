// @ts-check

/**
 * Application configuration values sourced from environment variables.
 */
export const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

/** @type {string} */
export const PIPER_MODEL_PATH =
  process.env.PIPER_MODEL ?? "/app/models/en_US-lessac-medium.onnx";

/**
 * @description Maximum allowed request body size is 1MB, which is sufficient for at least ~150000 words which is more than enough for typical use cases.
 * @type {number}
 */
export const MAX_BODY_SIZE_BYTES = 1_000_000;
