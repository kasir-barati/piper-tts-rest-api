// @ts-check

import { randomUUID } from "node:crypto";
import { MAX_BODY_SIZE_BYTES, PIPER_MODEL_PATH } from "../config/index.js";
import { synthesizeTextToMp3Buffer } from "../services/piper.js";
import { extractTextFromRequestBody, readRawBody } from "../utils/body.js";
import { sendBinary, sendJson } from "../utils/http.js";

/**
 * Handles text-to-speech API endpoint.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleSpeak(req, res) {
  try {
    const rawBody = await readRawBody(req, MAX_BODY_SIZE_BYTES);
    const text = extractTextFromRequestBody(
      rawBody,
      req.headers["content-type"],
    );

    if (!text) {
      sendJson(res, 400, {
        error:
          'Body must include non-empty text. Use JSON {"text":"..."} or text/plain.',
      });
      return;
    }

    const mp3Buffer = synthesizeTextToMp3Buffer(text, PIPER_MODEL_PATH);
    const outputName = `${Date.now()}-${randomUUID()}.mp3`;

    sendBinary(res, 200, mp3Buffer, {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `attachment; filename="${outputName}"`,
      "X-Output-File": outputName,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }

    if (error instanceof Error && error.message === "Request body too large") {
      sendJson(res, 413, { error: error.message });
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    sendJson(res, 500, { error: message });
  }
}
