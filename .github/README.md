# Piper TTS RESTful API

Dockerized Node.js (ESM) RESTful API for offline text-to-speech using Piper TTS.

🐳📦🚢 [The image in Docker Hub](https://hub.docker.com/r/9109679196/piper-tts-rest-api).

## Quick start

```bash
docker run --rm -p 3000:3000 9109679196/piper-tts-rest-api:latest
```

Then in another terminal:

```bash
curl -X POST http://localhost:3000/speak \
  -H 'content-type: application/json' \
  -d '{"text":"Hello from Piper API"}' \
  -o output.mp3
```

The response is a streamed MP3 (`Transfer-Encoding: chunked`, no `Content-Length`).

## Endpoints

For better tracing you can add a `correlation-id` header to your requests; if you do, it's echoed back on the response. Otherwise the server generates a UUID per request.

<table>
  <thead>
    <tr>
      <th>Endpoint</th>
      <th>Request</th>
      <th>Success response</th>
      <th>Errors</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>GET /health</code></td>
      <td>—</td>
      <td>
        <code>200 OK</code>, <code>text/plain</code><br>
        body: <code>OK</code>
      </td>
      <td>—</td>
    </tr>
    <tr>
      <td><code>POST /speak</code></td>
      <td>
        <ul>
          <li><code>application/json</code> with <code>{ "text": "..." }</code></li>
          <li><code>text/plain</code> with raw text body</li>
        </ul>
        Max body: <code>1 MB</code> (≈150 000 words — plenty for typical use).
      </td>
      <td>
        <code>200 OK</code> (streaming)<br>
        <code>Content-Type: audio/mpeg</code><br>
        <code>Content-Disposition: inline; filename="&lt;generated&gt;.mp3"</code><br>
        <code>Cache-Control: no-store</code><br>
        <code>Transfer-Encoding: chunked</code><br>
        Body: MP3 audio stream — read until the stream ends.
      </td>
      <td>
        <ul>
          <li><code>400</code> invalid JSON or missing/empty text</li>
          <li><code>413</code> payload too large</li>
          <li><code>500</code> synthesis or transcoding failure</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

### Examples

```bash
# JSON input
curl -X POST http://localhost:3000/speak \
  -H 'content-type: application/json' \
  -H 'correlation-id: 4484f9a3-7edb-492e-b815-52893ecb8eae' \
  -d '{"text":"Hello from Piper API"}' \
  -o output.mp3

# Plain text input
curl -X POST http://localhost:3000/speak \
  -H 'content-type: text/plain' \
  --data 'Hello from plain text body' \
  -o output.mp3
```

## Concurrency and cancellation

`POST /speak` is gated by an in-memory semaphore sized by `MAX_CONCURRENCY` (default `10`). The slot is held **for the entire lifetime of the work** — body parsing, piper synthesis, ffmpeg encoding, and streaming to the client — not just until child processes are spawned. So `MAX_CONCURRENCY` is an honest end-to-end concurrency cap.

When a client closes the connection before the response is fully sent (e.g. the user navigates away, the upstream service aborts via `AbortController`, or curl is `Ctrl-C`'d), the server kills the in-flight `piper` and `ffmpeg` child processes via `SIGKILL` and waits for them to exit before releasing the semaphore slot.

The net effect: **aborting an in-flight `/speak` request immediately frees a concurrency slot**, so a queued or subsequent request can start synthesis without waiting for the cancelled one to run to completion. This is useful for callers that implement supersede-with-retry patterns — a force-regenerate, for example, can cancel an in-flight TTS HTTP call to free CPU on the TTS host before kicking off a new one.

> [!NOTE]
>
> Cancellation is per-process and per-replica. If you run multiple replicas behind a load balancer, aborting a request only frees the slot on the replica that was handling it. There is no cross-replica cancellation.

> [!TIP]
>
> Pick a client-side timeout that allows for synthesis: piper takes ~2 s before producing the first audio byte for short inputs, and proportionally longer for longer text. Aggressive timeouts will cause spurious cancellations.

## Performance characteristics

Each `/speak` request spawns a fresh `piper` child process which loads the ONNX voice model (~61 MB for the bundled medium-quality voices) and initialises the ONNX runtime before it can begin synthesis. This adds a fixed **~1.7–2 s of cold-start cost per request**, on top of the actual synthesis time.

This service is deliberately **not** optimised for lowest-latency-per-request or highest-throughput workloads. The CLI we drive (`piper --output-raw`) has no daemon mode, so a long-lived in-memory model is not on the table without rewriting against piper's Python library. If your use case is latency-sensitive (e.g. interactive UI feedback), drive piper from Python with a single long-lived model handle instead of going through this REST API.

For batch / offline-narration workloads — which is what this service is designed for — the 2 s cold start is negligible compared to the actual synthesis time of multi-paragraph inputs, and the per-request process boundary makes cancellation and resource cleanup trivial (see [Concurrency and cancellation](#concurrency-and-cancellation) above).

## Configuration

All configuration is via environment variables.

| Variable          | Default                                | Description                                                                                                                                              |
| ----------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`            | `3000`                                 | HTTP port the server listens on.                                                                                                                         |
| `PIPER_MODEL`     | `/app/models/en_US-lessac-medium.onnx` | Path to the Piper voice model. The matching `<model>.onnx.json` sidecar must exist next to it (the server reads `audio.sample_rate` from it at startup). |
| `MAX_CONCURRENCY` | `10`                                   | Maximum number of `/speak` requests handled concurrently. Additional requests queue at the semaphore until a slot is freed.                              |
| `SERVICE_NAME`    | `piper-tts-rest-api`                   | Service name shown in log lines.                                                                                                                         |
| `LOGGING_MODE`    | `PLAIN_TEXT`                           | `PLAIN_TEXT` or `JSON`. See [Logging](#logging) below.                                                                                                   |
| `LOGGING_LEVEL`   | `info`                                 | One of `error`, `warn`, `info`, `debug`, `verbose`.                                                                                                      |

The maximum request body size (1 MB) is fixed in [`src/shared/config.ts`](../src/shared/config.ts) (`maxBodySizeBytes`).

## Logging

Every request and response is logged with a correlation ID for tracing.

<details><summary><code>LOGGING_MODE=PLAIN_TEXT</code> (default)</summary>

```
[2026-03-08T00:17:21.123Z]     HttpMiddleware       [piper-tts-rest-api] (correlationId: 2b20be5b-0028-4eec-9bfc-02aff54d006e) Incoming POST /speak | {"method":"POST","url":"/speak","headers":{...}}
```

</details>

<details><summary><code>LOGGING_MODE=JSON</code></summary>

```json
{
  "timestamp": "2026-03-08T00:17:21.123Z",
  "level": "info",
  "service": "piper-tts-rest-api",
  "correlationId": "65219ad1-21a6-44e5-a3d4-9bfb070d7566",
  "context": "HttpMiddleware",
  "message": "Incoming POST /speak",
  "method": "POST",
  "url": "/speak",
  "headers": {}
}
```

Use this for log aggregators (e.g. Loki, Elasticsearch, Datadog).

</details>

## How the audio pipeline works

The service streams audio end-to-end with no intermediate files:

1. `piper --output-raw` writes signed 16-bit little-endian mono PCM samples to its stdout.
2. ffmpeg reads that raw PCM (`-f s16le -ar <rate> -ac 1 -i pipe:0`) and encodes MP3 on the fly.
3. The API streams ffmpeg's MP3 output to the HTTP response with `Transfer-Encoding: chunked`.

The PCM sample rate is read once at process startup from the model's `.onnx.json` sidecar (`audio.sample_rate`) and passed to ffmpeg.

## Bundled English voice models

The Docker image ships these Piper voices under `/app/models/`:

- `en_US-lessac-medium.onnx` (default)
- `en_US-ryan-medium.onnx`
- `en_US-libritts_r-medium.onnx`
- `en_US-ljspeech-medium.onnx`
- `en_US-amy-medium.onnx`
- `en_US-joe-medium.onnx`
- `en_US-john-medium.onnx`
- `en_US-kristin-medium.onnx`

Switch voices via `PIPER_MODEL=/app/models/<voice>.onnx`.
