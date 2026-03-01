// @ts-check

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { execFileSync, spawn, spawnSync } from "node:child_process";

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

/**
 * @typedef {import('node:child_process').ChildProcess} ChildProcess
 * @typedef {import('node:child_process').ChildProcessWithoutNullStreams} ChildProcessWithoutNullStreams
 */

/**
 * Assert helper to narrow ChildProcess -> ChildProcessWithoutNullStreams
 * @param {ChildProcess} cp
 * @returns {asserts cp is ChildProcessWithoutNullStreams}
 */
function assertStreams(cp) {
  if (!cp.stdin || !cp.stdout || !cp.stderr) {
    throw new Error(
      "Child process stdio not piped (stdin/stdout/stderr is null)",
    );
  }
}

/**
 * @description Spawn Piper and emit WAV to stdout (headered stream).
 *
 * @param {string} text
 * @param {string} modelPath
 * @returns {ChildProcessWithoutNullStreams}
 */
export function spawnPiperWavStdout(text, modelPath) {
  const args = ["--model", modelPath, "--output_file", "-"]; // WAV on stdout
  const childProcess = spawn("piper", args, {
    stdio: ["pipe", "pipe", "pipe"],
  });

  assertStreams(childProcess); // <-- narrows types for TS

  childProcess.stdin.write(text + "\n"); // newline helps ensure synthesis starts
  childProcess.stdin.end();
  return childProcess;
}

/**
 * @description Spawn ffmpeg to read WAV from stdin and encode MP3 to stdout.
 * @returns {ChildProcessWithoutNullStreams}
 */
export function spawnFfmpegMp3FromWav() {
  const args = [
    "-loglevel",
    "error",
    "-i",
    "pipe:0", // read WAV from stdin
    "-codec:a",
    "libmp3lame",
    "-q:a",
    "2", // adjust quality as needed
    "-f",
    "mp3",
    "pipe:1", // write MP3 to stdout
  ];
  const childProcess = spawn("ffmpeg", args, {
    stdio: ["pipe", "pipe", "pipe"],
  });

  assertStreams(childProcess);

  return childProcess;
}
