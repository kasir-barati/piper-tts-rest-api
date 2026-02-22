// @ts-check

import { createServer as createHttpServer } from "node:http";
import { PIPER_MODEL_PATH, PORT } from "./config/index.js";
import { handleHealth } from "./routes/health.js";
import { handleSpeak } from "./routes/speak.js";
import { verifyPiperInstallation } from "./services/piper.js";
import { sendText } from "./utils/http.js";

/**
 * Creates the API server.
 * @returns {import('node:http').Server}
 */
function createServer() {
  return createHttpServer(async (req, res) => {
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
  });
}

/**
 * Bootstraps API dependencies and starts the HTTP server.
 * @returns {void}
 */
function bootstrap() {
  verifyPiperInstallation(PIPER_MODEL_PATH);

  const server = createServer();
  server.listen(PORT, () => {
    console.log(`TTS API running on port ${PORT}`);
    console.log(`Piper model: ${PIPER_MODEL_PATH}`);
  });
}

bootstrap();
