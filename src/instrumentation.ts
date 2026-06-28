/**
 * @fileoverview OpenTelemetry bootstrap for piper-tts-rest-api.
 *
 * This module MUST be loaded as a Node preload via `node --import` so the SDK starts before any user module — and crucially before `node:http` — is resolved. That is the only way `@opentelemetry/instrumentation-http` can monkey-patch `http.createServer` before our route layer captures a reference to the un-patched function.
 *
 * Wired up in `package.json`'s "start" script. A plain `import "./instrumentation.js"` in the `server.ts` is NOT sufficient under ESM: all `import` statements in a module are evaluated before its body runs, so `node:http` would be captured before the SDK started.
 */

/**
 * @note
 * Register `import-in-the-middle` as a Node module-customization hook BEFORE we import anything else. Under ESM, `--import` alone is not enough to make `@opentelemetry/instrumentation-http` patch `node:http`: the instrumentation's monkey-patching mechanism relies on intercepting the import resolution of the target module, which under ESM only happens if a loader hook is registered. `@opentelemetry/instrumentation/hook.mjs` ships a thin wrapper around `import-in-the-middle` that exposes exactly such a hook. We register it via `node:module#register` (stable on Node ≥ 20.6) and *only* on the current module's parent URL so the hook applies to the whole runtime.
 *
 * Without this block, you will see:
 *
 * - No `POST /...` server span from `@opentelemetry/instrumentation-http`.
 * - Incoming `traceparent` headers silently dropped (no context extraction).
 * - Every manual span becoming a root span.
 */
import { register } from "node:module";

register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from "@opentelemetry/core";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

import { config, createLogger } from "./shared/index.js";

const logger = createLogger(
  config.log.level,
  config.log.mode,
  config.service.name,
);
let otelSDK: NodeSDK | null = null;

if (!config.otel.enabled) {
  logger.info("OTEL_ENABLED!=true — OpenTelemetry SDK is disabled.", {
    context: "Instrumentation",
  });
} else {
  diag.setLogger(
    new DiagConsoleLogger(),
    process.env.NODE_ENV === "development"
      ? DiagLogLevel.DEBUG
      : DiagLogLevel.WARN,
  );

  const exporter = new OTLPTraceExporter({
    url: config.otel.exporterEndpoint
      ? `${config.otel.exporterEndpoint.replace(/\/$/, "")}/v1/traces`
      : undefined,
  });
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.service.name,
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "unknown",
    "deployment.environment": config.service.env,
  });
  /**
   * @description Plain HTTP instrumentation. Skipping the health check endpoint so we don't drown the collector in noise.
   */
  const httpInstrumentation = new HttpInstrumentation({
    ignoreIncomingRequestHook: (req) => {
      const url = req.url ?? "";
      return url === "/health";
    },
  });
  /**
   * @description Batch spans in memory and flush them to the exporter periodically (or when the batch fills up) instead of exporting one-by-one. This amortizes network cost and keeps the hot path cheap.
   */
  const batchSpanProcessor = new BatchSpanProcessor(exporter, {
    maxQueueSize: config.otel.batchConfig.maxPendingSpans,
    maxExportBatchSize: config.otel.batchConfig.spansPerExport,
    scheduledDelayMillis: config.otel.batchConfig.flushIntervalMs,
    exportTimeoutMillis: config.otel.batchConfig.exportTimeoutMs,
  });

  otelSDK = new NodeSDK({
    resource,
    spanProcessors: [batchSpanProcessor],
    textMapPropagator: new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    }),
    instrumentations: [httpInstrumentation],
  });

  otelSDK.start();

  logger.info(
    `OpenTelemetry SDK started for service "${config.service.name}".`,
    {
      context: "Instrumentation",
    },
  );

  const shutdown = (): void => {
    otelSDK
      ?.shutdown()
      .then(
        () =>
          logger.info("OTel SDK shut down cleanly.", {
            context: "Instrumentation",
          }),
        (err: unknown) =>
          logger.error("OTel SDK shutdown error.", {
            context: "Instrumentation",
            error: err instanceof Error ? err.message : String(err),
          }),
      )
      .finally(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

export { otelSDK };
