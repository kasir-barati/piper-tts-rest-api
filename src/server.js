// @ts-check

import { createServer as createHttpServer } from "node:http";
import {
  LOGGING_LEVEL,
  LOGGING_MODE,
  PIPER_MODEL_PATH,
  PORT,
  SERVICE_NAME,
} from "./config/index.js";
import { withLogging } from "./middlewares/logging.js";
import { handleHealth } from "./routes/health.js";
import { handleSpeak } from "./routes/speak.js";
import {
  verifyFfmpegInstallation,
  verifyPiperInstallation,
} from "./services/piper.js";
import { sendText } from "./utils/http.js";
import { createLogger } from "./utils/logger.js";

// Create logger instance
export const logger = createLogger(LOGGING_LEVEL, LOGGING_MODE, SERVICE_NAME);

/**
 * Creates the API server.
 * @returns {import('node:http').Server}
 */
function createServer() {
  /**
   *
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   */
  const handler = async (req, res) => {
    if (!req.url || !req.method) {
      sendText(res, 400, "Bad Request");
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      handleHealth(res);
      return;
    }

    if (req.method === "POST" && req.url === "/speak") {
      await handleSpeak(req, res);
      return;
    }

    sendText(res, 404, "Not Found");
  };

  return createHttpServer(withLogging(logger, handler));
}

/**
 * Bootstraps API dependencies and starts the HTTP server.
 * @returns {void}
 */
function bootstrap() {
  verifyPiperInstallation(PIPER_MODEL_PATH);
  verifyFfmpegInstallation();

  const server = createServer();
  server.listen(PORT, () => {
    logger.info(`TTS API running on port ${PORT}`, { context: "Bootstrap" });
    logger.info(`Piper model: ${PIPER_MODEL_PATH}`, { context: "Bootstrap" });
  });
}

bootstrap();
