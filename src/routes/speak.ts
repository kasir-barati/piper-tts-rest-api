import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { config } from "../config/index.js";
import {
  spawnFfmpegMp3FromWav,
  spawnPiperWavStdout,
} from "../services/index.js";
import {
  extractTextFromRequestBody,
  readRawBody,
  sendJson,
  Semaphore,
} from "../utils/index.js";

const speakSemaphore = new Semaphore(config.maxConcurrency);

/**
 * Handles text-to-speech API endpoint.
 */
export async function handleSpeak(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  speakSemaphore.run(async () => {
    try {
      const rawBody = await readRawBody(req, config.maxBodySizeBytes);
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

      const piper = spawnPiperWavStdout(text, config.piperModelPath);
      const ffmpeg = spawnFfmpegMp3FromWav();

      // Pipe audio
      piper.stdout.pipe(ffmpeg.stdin);
      ffmpeg.stdout.pipe(res);

      const fail = (msg: string): void => {
        try {
          res.destroy(new Error(msg));
        } catch {
          /* ignore */
        }
        try {
          piper.kill("SIGKILL");
        } catch {
          /* ignore */
        }
        try {
          ffmpeg.kill("SIGKILL");
        } catch {
          /* ignore */
        }
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

      piper.stderr.on("data", (_buf: Buffer) => {
        /* optional logs/progress */
      });
      ffmpeg.stderr.on("data", (_buf: Buffer) => {
        /* optional logs */
      });

      const abort = (): void => {
        try {
          piper.kill("SIGKILL");
        } catch {
          /* ignore */
        }
        try {
          ffmpeg.kill("SIGKILL");
        } catch {
          /* ignore */
        }
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
