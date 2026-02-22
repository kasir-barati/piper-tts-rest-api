// @ts-check

/**
 * Application configuration values sourced from environment variables.
 */
export const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

/** @type {string} */
export const PIPER_MODEL_PATH =
  process.env.PIPER_MODEL ?? "/app/models/en_US-lessac-medium.onnx";

/** @type {number} */
export const MAX_BODY_SIZE_BYTES = 1_000_000;
