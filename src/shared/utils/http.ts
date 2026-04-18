import type { ServerResponse } from "node:http";

/**
 * Sends plain-text response.
 */
export function sendText(
  res: ServerResponse,
  statusCode: number,
  text: string,
): void {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

/**
 * Sends JSON response.
 */
export function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

/**
 * Sends binary response.
 */
export function sendBinary(
  res: ServerResponse,
  statusCode: number,
  body: Buffer,
  headers: Record<string, string | number> = {},
): void {
  res.writeHead(statusCode, {
    "Content-Length": body.length,
    ...headers,
  });
  res.end(body);
}
