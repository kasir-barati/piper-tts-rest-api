// @ts-check

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";

/**
 * Ensures Piper CLI and model are available before serving requests.
 * @param {string} modelPath
 * @returns {void}
 * @throws {Error}
 */
export function verifyPiperInstallation(modelPath) {
  try {
    execFileSync("piper", ["--help"], { stdio: "pipe" });
  } catch {
    throw new Error("Piper is not installed or not available in PATH");
  }

  if (!existsSync(modelPath)) {
    throw new Error(`Piper model not found: ${modelPath}`);
  }
}

/**
 * Ensures ffmpeg is available before serving requests.
 * @returns {void}
 * @throws {Error}
 */
export function verifyFfmpegInstallation() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "pipe" });
  } catch {
    throw new Error("ffmpeg is not installed or not available in PATH");
  }
}

/**
 * Generates MP3 bytes from input text by first synthesizing WAV via Piper and then transcoding to MP3 via ffmpeg.
 * @param {string} text
 * @param {string} modelPath
 * @returns {Buffer}
 * @throws {Error}
 */
export function synthesizeTextToMp3Buffer(text, modelPath) {
  const workDir = mkdtempSync(join(tmpdir(), "tts-api-"));
  const fileId = randomUUID();
  const wavPath = join(workDir, `${fileId}.wav`);
  const mp3Path = join(workDir, `${fileId}.mp3`);

  try {
    const piperResult = spawnSync(
      "piper",
      ["--model", modelPath, "--output_file", wavPath],
      {
        input: text,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    if (piperResult.status !== 0) {
      throw new Error(
        (piperResult.stderr || "").trim() ||
          "Piper exited with a non-zero status code",
      );
    }

    const ffmpegResult = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-i",
        wavPath,
        "-codec:a",
        "libmp3lame",
        "-q:a",
        "2",
        mp3Path,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    if (ffmpegResult.status !== 0) {
      throw new Error(
        (ffmpegResult.stderr || "").toString().trim() ||
          "ffmpeg exited with a non-zero status code",
      );
    }

    return readFileSync(mp3Path);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}
