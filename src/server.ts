import { createServer as createHttpServer, type Server } from "node:http";
import { config } from "./config/index.js";
import { withLogging } from "./middlewares/index.js";
import { handleHealth, handleSpeak } from "./routes/index.js";
import {
  verifyFfmpegInstallation,
  verifyPiperInstallation,
} from "./services/index.js";
import { createLogger, sendText } from "./utils/index.js";
import type { IncomingMessage, ServerResponse } from "node:http";

// Create logger instance
export const logger = createLogger(
  config.log.level,
  config.log.mode,
  config.service.name,
);

/**
 * Creates the API server.
 */
function createServer(): Server {
  const handler = async (
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> => {
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
 */
function bootstrap(): void {
  verifyPiperInstallation(config.piperModelPath);
  verifyFfmpegInstallation();

  const server = createServer();
  server.listen(config.service.port, () => {
    logger.info(`TTS API running on port ${config.service.port}`, {
      context: "Bootstrap",
    });
    logger.info(`Piper model: ${config.piperModelPath}`, {
      context: "Bootstrap",
    });
  });
}

bootstrap();
