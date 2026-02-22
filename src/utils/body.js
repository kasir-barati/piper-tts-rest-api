// @ts-check

/**
 * Reads the raw request body up to a maximum size.
 * @param {import('node:http').IncomingMessage} req
 * @param {number} maxBodySizeBytes
 * @returns {Promise<string>}
 */
export function readRawBody(req, maxBodySizeBytes) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodySizeBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", reject);
  });
}

/**
 * Extracts speakable text from request payload.
 * Accepts JSON (`{ "text": "..." }`) or raw plain text.
 * @param {string} rawBody
 * @param {string | undefined} contentType
 * @returns {string}
 */
export function extractTextFromRequestBody(rawBody, contentType) {
  if (!rawBody || !rawBody.trim()) {
    return "";
  }

  if ((contentType ?? "").includes("application/json")) {
    const parsed = JSON.parse(rawBody);
    return typeof parsed.text === "string" ? parsed.text.trim() : "";
  }

  return rawBody.trim();
}
