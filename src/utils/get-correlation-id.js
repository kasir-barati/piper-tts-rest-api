import { randomUUID } from "node:crypto";

/**
 *
 * @param {import('node:http').IncomingMessage} req
 * @returns {string}
 */
export function getCorrelationId(req) {
  const headerValue = req.headers["correlation-id"];
  const correlationId =
    (Array.isArray(headerValue) ? headerValue[0] : headerValue) ?? null;

  return correlationId ?? randomUUID();
}
