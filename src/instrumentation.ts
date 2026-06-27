/**
 * @fileoverview OpenTelemetry bootstrap for piper-tts-rest-api.
 *
 * MUST be imported as the very first line of `server.ts` so the SDK starts before any `node:http` server is created (auto-instrumentation needs to wrap `http.createServer` before our code calls it).
 *
 * Driven entirely by env vars so consumers of the published Docker image can opt in / out without rebuilding:
 *
 * - OTEL_ENABLED
 * - OTEL_EXPORTER_OTLP_ENDPOINT
 * - SERVICE_NAME
 * - OTEL_TRACES_SAMPLER / OTEL_TRACES_SAMPLER_ARG
 *
 */

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
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

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
