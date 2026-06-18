import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";

import { randomUUID } from "node:crypto";
import { pipeline } from "node:stream/promises";

import {
  readPiperModelSampleRate,
  spawnFfmpegMp3FromPcm,
  spawnPiperPcmStdout,
} from "../services/index.js";
import {
  config,
  extractTextFromRequestBody,
  readRawBody,
  Semaphore,
  sendJson,
} from "../shared/index.js";

const speakSemaphore = new Semaphore(config.maxConcurrency);
/**
 * @description Read once at module load. The model's sample rate is encoded in the network weights and never changes for the life of the process; the `.onnx.json` sidecar simply exposes it. We need it because piper's `--output-raw` mode emits headerless PCM so ffmpeg has to be told the rate explicitly via `-ar`.
 */
const piperSampleRate = readPiperModelSampleRate(config.piperModelPath);

/**
 * @summary Handles text-to-speech API endpoint.
 * @description The semaphore slot is held for the full lifetime of the work — body parsing, child-process synthesis, and streaming — so `MAX_CONCURRENCY` actually caps how many TTS pipelines run end-to-end (not just how many
 * can simultaneously enter the spawn step).
 */
export async function handleSpeak(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await speakSemaphore.run(async () => {
    try {
      await runSpeak(req, res);
    } catch (error) {
      // Defense in depth — `runSpeak` is meant to handle its own errors.
      if (!res.headersSent) {
        sendJson(res, 500, {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } else if (!res.writableEnded) {
        res.destroy();
      }
    }
  });
}

async function runSpeak(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  // ─── Parse request ──────────────────────────────────────────────────
  let text: string | null;
  try {
    const rawBody = await readRawBody(req, config.maxBodySizeBytes);
    text = extractTextFromRequestBody(rawBody, req.headers["content-type"]);
  } catch (error) {
    sendEarlyError(res, error);
    return;
  }

  if (!text) {
    sendJson(res, 400, {
      error:
        'Body must include non-empty text. Use JSON {"text":"..."} or text/plain.',
    });
    return;
  }

  // ─── Spawn the pipeline ─────────────────────────────────────────────
  const piper = spawnPiperPcmStdout(text, config.piperModelPath);
  const ffmpeg = spawnFfmpegMp3FromPcm(piperSampleRate);

  // Drop stderr so its buffer doesn't fill (which would block the child). Swap `resume()` for a `'data'` listener if you want to log stderr.
  piper.stderr.resume();
  ffmpeg.stderr.resume();

  // Cancellation: abort the pipeline only on premature client disconnect. `res.on('close')` fires for BOTH normal completion AND abort, so we gate on `res.writableFinished` (the documented way to detect a premature close — false ⇒ data was not flushed). `req.on('aborted')` is deprecated since Node 16.12 / 17 in favour of `req.on('close')` + checking `req.complete`.
  const ac = new AbortController();
  const onClientGone = (): void => {
    if (!res.writableFinished) {
      ac.abort(new Error("Client disconnected"));
    }
  };
  req.on("close", onClientGone);
  res.on("close", onClientGone);

  // ─── Send headers and stream ────────────────────────────────────────
  const outputName = `${Date.now()}-${randomUUID()}.mp3`;
  res.writeHead(200, {
    "Content-Type": "audio/mpeg",
    "Content-Disposition": `inline; filename="${outputName}"`,
    "Cache-Control": "no-store",
  });

  try {
    // The two pipelines must run CONCURRENTLY: ffmpeg only produces output as it consumes input, so awaiting them in sequence would deadlock (ffmpeg would block trying to drain its output buffer with no reader attached). `stream.pipeline()` is the documented best practice for stream chains — on any failure or abort it calls `destroy()` on every stream in the chain, removing the manual cleanup choreography we'd otherwise need.
    await Promise.all([
      pipeline(piper.stdout, ffmpeg.stdin, { signal: ac.signal }),
      pipeline(ffmpeg.stdout, res, { signal: ac.signal, end: true }),
    ]);
  } catch (error) {
    // Tear down both children (SIGKILL — piper is CPU-bound, we want the slot freed immediately, not after a graceful-shutdown grace period).
    killSafely(piper);
    killSafely(ffmpeg);

    // Headers are already out at this point (we called writeHead before the pipeline). The honest signal of failure to the client is to destroy the socket so they see a truncated response.
    if (!res.writableEnded) {
      res.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  } finally {
    req.off("close", onClientGone);
    res.off("close", onClientGone);

    // Wait for both children to fully exit before returning. This is what makes the semaphore actually gate end-to-end concurrency: the slot is only released after this function returns, and this function only returns once piper and ffmpeg are gone. Per the Node.js docs `'close'` is guaranteed to fire (after `'exit'` or after `'error'` for a failed spawn), so this never hangs as long as we reach this block.
    await Promise.allSettled([waitForClose(piper), waitForClose(ffmpeg)]);
  }
}

/**
 * @description Resolves when the child emits `'close'`.
 * If the child has already exited (exitCode/signalCode set) we resolve immediately because no further events will fire.
 */
function waitForClose(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    child.once("close", () => resolve());
  });
}

function killSafely(child: ChildProcessWithoutNullStreams): void {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  try {
    child.kill("SIGKILL");
  } catch {
    /* already gone */
  }
}

function sendEarlyError(res: ServerResponse, error: unknown): void {
  if (error instanceof SyntaxError) {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }
  if (error instanceof Error && error.message === "Request body too large") {
    sendJson(res, 413, { error: error.message });
    return;
  }
  sendJson(res, 500, {
    error: error instanceof Error ? error.message : "Unknown error",
  });
}
