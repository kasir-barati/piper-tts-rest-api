// @ts-check

/**
 * Sends plain-text response.
 * @param {import('node:http').ServerResponse} res
 * @param {number} statusCode
 * @param {string} text
 * @returns {void}
 */
export function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

/**
 * Sends JSON response.
 * @param {import('node:http').ServerResponse} res
 * @param {number} statusCode
 * @param {unknown} payload
 * @returns {void}
 */
export function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

/**
 * Sends binary response.
 * @param {import('node:http').ServerResponse} res
 * @param {number} statusCode
 * @param {Buffer} body
 * @param {Record<string, string | number>} headers
 * @returns {void}
 */
export function sendBinary(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Length": body.length,
    ...headers,
  });
  res.end(body);
}
