// @ts-check

import { randomUUID } from "node:crypto";
import {
  MAX_BODY_SIZE_BYTES,
  MAX_CONCURRENCY,
  PIPER_MODEL_PATH,
} from "../config/index.js";
import {
  spawnFfmpegMp3FromWav,
  spawnPiperWavStdout,
} from "../services/piper.js";
import { extractTextFromRequestBody, readRawBody } from "../utils/body.js";
import { sendJson } from "../utils/http.js";
import { Semaphore } from "../utils/semaphore.js";

const speakSemaphore = new Semaphore(MAX_CONCURRENCY);

/**
 * Handles text-to-speech API endpoint.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @returns {Promise<void>}
 */
export async function handleSpeak(req, res) {
  speakSemaphore.run(async () => {
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

      const outputName = `${Date.now()}-${randomUUID()}.mp3`;

      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `inline; filename="${outputName}"`,
        "Cache-Control": "no-store",
      });

      const piper = spawnPiperWavStdout(text, PIPER_MODEL_PATH);
      const ffmpeg = spawnFfmpegMp3FromWav();

      // Pipe audio
      piper.stdout.pipe(ffmpeg.stdin);
      ffmpeg.stdout.pipe(res);

      /** @type {(msg: string) => void} */
      const fail = (msg) => {
        try {
          res.destroy(new Error(msg));
        } catch {}
        try {
          piper.kill("SIGKILL");
        } catch {}
        try {
          ffmpeg.kill("SIGKILL");
        } catch {}
      };

      // Chained handlers
      piper
        .on("error", (error) => fail(`piper error: ${error?.message ?? error}`))
        .on("close", (code) => {
          if (code !== 0) {
            return fail(`piper exited with code ${code}`);
          }
          if (ffmpeg.stdin.writable) {
            // let ffmpeg flush
            ffmpeg.stdin.end();
          }
        });

      ffmpeg
        .on("error", (error) =>
          fail(`ffmpeg error: ${error?.message ?? error}`),
        )
        .on("close", (code) => {
          if (code !== 0) {
            return fail(`ffmpeg exited with code ${code}`);
          }
          if (!res.writableEnded) {
            res.end();
          }
        });

      piper.stderr.on("data", (_buf) => {
        /* optional logs/progress */
      });
      ffmpeg.stderr.on("data", (_buf) => {
        /* optional logs */
      });

      const abort = () => {
        try {
          piper.kill("SIGKILL");
        } catch {}
        try {
          ffmpeg.kill("SIGKILL");
        } catch {}
      };

      req.on("aborted", abort);
      res.on("close", abort);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }

      if (
        error instanceof Error &&
        error.message === "Request body too large"
      ) {
        return sendJson(res, 413, { error: error.message });
      }

      sendJson(res, 500, {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
