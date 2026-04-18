import type { IncomingMessage, ServerResponse } from "node:http";

import { getCorrelationId, type Logger } from "../utils/index.js";

type RequestHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => void | Promise<void>;

/**
 * Creates a logging middleware that logs incoming requests and responses.
 */
export function createLoggingMiddleware(
  logger: Logger,
): (req: IncomingMessage, res: ServerResponse, next: () => void) => void {
  return (req, res, next) => {
    const correlationId = getCorrelationId(req);

    res.setHeader("correlation-id", correlationId);

    const startTime = Date.now();
    const method = req.method ?? "UNKNOWN";
    const url = req.url ?? "/";

    // Log incoming request
    logger.info(`Incoming ${method} ${url}`, {
      context: "HttpMiddleware",
      correlationId,
      method,
      url,
      headers: req.headers,
    });

    // Intercept response finish to log completion
    const originalEnd = res.end;
    res.end = function (this: ServerResponse, ...args: unknown[]) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      logger.info(`Completed ${method} ${url}`, {
        context: "HttpMiddleware",
        correlationId,
        method,
        url,
        statusCode,
        duration,
      });

      return (originalEnd as (...args: unknown[]) => ServerResponse).apply(
        this,
        args,
      );
    } as ServerResponse["end"];

    next();
  };
}

/**
 * Wraps a request handler to include logging middleware functionality.
 */
export function withLogging(
  logger: Logger,
  handler: RequestHandler,
): RequestHandler {
  return (req, res) => {
    const correlationId = getCorrelationId(req);

    res.setHeader("correlation-id", correlationId);

    const startTime = Date.now();
    const method = req.method ?? "UNKNOWN";
    const url = req.url ?? "/";

    // Log incoming request
    logger.info(`Incoming ${method} ${url}`, {
      context: "HttpMiddleware",
      correlationId,
      method,
      url,
      headers: req.headers,
    });

    // Intercept response finish to log completion
    const originalEnd = res.end;
    res.end = function (this: ServerResponse, ...args: unknown[]) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      logger.info(`Completed ${method} ${url}`, {
        context: "HttpMiddleware",
        correlationId,
        method,
        url,
        statusCode,
        duration,
      });

      return (originalEnd as (...args: unknown[]) => ServerResponse).apply(
        this,
        args,
      );
    } as ServerResponse["end"];

    // Call the actual handler
    return handler(req, res);
  };
}
