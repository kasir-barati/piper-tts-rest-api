// @ts-check

import { getCorrelationId } from "../utils/get-correlation-id.js";

/**
 * Creates a logging middleware that logs incoming requests and responses.
 * @param {import('../utils/logger.js').Logger} logger - The logger instance
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: Function) => void}
 */
export function createLoggingMiddleware(logger) {
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
    // @ts-expect-error - happens because the `res.end` method has multiple overloads
    res.end = function (...args) {
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

      // @ts-expect-error - Call the original end method
      return originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * @description Wraps a request handler to include logging middleware functionality.
 * @param {import('../utils/logger.js').Logger} logger - The logger instance
 * @param {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void | Promise<void>} handler - The request handler
 * @returns {(req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void | Promise<void>}
 */
export function withLogging(logger, handler) {
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
    // @ts-expect-error - happens because the `res.end` method has multiple overloads
    res.end = function (...args) {
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

      // @ts-expect-error - Call the original end method
      return originalEnd.apply(res, args);
    };

    // Call the actual handler
    return handler(req, res);
  };
}
