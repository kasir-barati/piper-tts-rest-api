import type { IncomingMessage } from "node:http";

import { randomUUID } from "node:crypto";

export function getCorrelationId(req: IncomingMessage): string {
  const headerValue = req.headers["correlation-id"];
  const correlationId =
    (Array.isArray(headerValue) ? headerValue[0] : headerValue) ?? null;

  return correlationId ?? randomUUID();
}
