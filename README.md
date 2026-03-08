# Piper TTS RESTful API

Dockerized Node.js (ESM) RESTful API for offline text-to-speech using Piper TTS.

🐳📦🚢 [The image in Docker Hub](https://hub.docker.com/r/9109679196/piper-tts-rest-api).

## Logging System

This project includes a lightweight logging middleware that logs all incoming HTTP requests and their responses. You can configure it through environment variables:

<details><summary><code>LOGGING_MODE</code></summary>

- **`PLAIN_TEXT`** (default): Human-readable format
  ```bash
  [2026-03-08T00:17:21.123Z]     HttpMiddleware       [piper-tts-rest-api] (correlationId: 2b20be5b-0028-4eec-9bfc-02aff54d006e) Incoming POST /speak | {"method":"POST","url":"/speak","headers":{...}}
  ```
- **`JSON`**: Structured JSON format (ideal for log aggregation tools)
  ```json
  {"timestamp":"2026-03-08T00:17:21.123Z","level":"info","service":"piper-tts-rest-api","correlationId":"65219ad1-21a6-44e5-a3d4-9bfb070d7566","context":"HttpMiddleware","message":"Incoming POST /speak","method":"POST","url":"/speak","headers":{...}}
  ```

</details>
<details><summary><code>LOGGING_LEVEL</code></summary>

Available levels (from least to most verbose):

- **`error`**: Only error messages
- **`warn`**: Warnings and errors
- **`info`** (default): Informational messages, warnings, and errors
- **`debug`**: Debug information and all above
- **`verbose`**: All logs including verbose details

</details>
<details><summary><code>SERVICE_NAME</code></summary>

- **Default**: `piper-tts-rest-api`
- The name of the service shown in the logs.

</details>

> [!TIP]
>
> Use this logging for monitoring and KPI (Key Performance Indicator) purposes.

## API documentation

For better tracking you can add a correlation ID to your requests:

1. **If the client sends a `correlation-id` header**, it will be used and echoed back in the response.
2. **If no `correlation-id` header is present**, the middleware generates a UUID and adds it to both the request and response headers.

<table>
  <thead>
    <tr>
      <th>Endpoint</th>
      <th>Request (Body formats)</th>
      <th>Success response</th>
      <th>Typical headers</th>
      <th>Body</th>
      <th>Examples</th>
      <th>Validation / Errors</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>GET /health</code></td>
      <td>—</td>
      <td>
        Status: <code>200</code><br>
        Content-Type: <code>text/plain</code>
      </td>
      <td>—</td>
      <td><code>OK</code></td>
      <td>
        <pre><code>curl -i http://localhost:3000/health</code></pre>
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
      </td>
      <td>
        Status: <code>200</code> (streaming)<br>
        Content-Type: <code>audio/mpeg</code>
      </td>
      <td>
        <ul>
          <li><code>Content-Disposition: inline; filename="&lt;generated&gt;.mp3"</code></li>
          <li><code>Cache-Control: no-store</code></li>
          <li>(HTTP/1.1 only) <code>Transfer-Encoding: chunked</code></li>
          <li>No <code>Content-Length</code>; read until stream ends</li>
        </ul>
      </td>
      <td>MP3 audio stream (bytes sent progressively)</td>
      <td>
        <pre><code># JSON input
curl -X POST http://localhost:3000/speak \
  -H 'content-type: application/json' \
  -H "correlation-id: 4484f9a3-7edb-492e-b815-52893ecb8eae" \
  -d '{"text":"Hello from Piper API"}' \
  -o output.mp3</pre></code><pre><code>
# Plain text input
curl -X POST http://localhost:3000/speak \
  -H 'content-type: text/plain' \
  --data 'Hello from plain text body' \
  -o output.mp3</code></pre>
      </td>
      <td>
        <ul>
          <li><code>400</code> invalid JSON or missing/empty text</li>>
          <li><code>413</code> payload too large</li>
          <li><code>500</code> synthesis/transcoding failures</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

> [!TIP]
>
> Here we will spawn a new child process for each request to the speak API, what that entails is loading the model in memory again and again. It can be said that it is **NOT a good idea if you need lowest latency / highest throughput**.

> [!NOTE]
>
> The maximum allowed text size is more than enough for 90% of scenarios (learn more [here](./src/config/index.js)), and keep in mind that if for any reason you try to upload even half of the allowed maximum size you'd have to wait for roughly 15 minutes:
>
> ```bash
> wc input/half-maximum-allowed-size.txt
> # 3507     81663 492149 input/half-maximum-allowed-size.txt
> # ⬆️       ⬆️    ⬆️
> # newline, word, byte counts
> ls -lh input/half-maximum-allowed-size.txt
> # -rw-rw-r-- 1 kasir kasir 481K Feb 23 00:20 input/half-maximum-allowed-size.txt
>   % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
>                                  Dload  Upload   Total   Spent    Left  Speed
> 100  225M  100  224M  100  480k   252k    540  0:15:11  0:15:11 --:--:-- 53.0M
> -rw-rw-r-- 1 mjb mjb 225M Feb 23 01:14 hello-world.mp3
> ```

## Piper TTS notes

This project uses Piper as the TTS engine and ffmpeg for MP3 encoding:

1. Piper generates temporary WAV audio.
2. ffmpeg converts WAV to MP3.
3. API returns MP3 bytes to the client.

Default model in container:

- `/app/models/en_US-lessac-medium.onnx`

Environment variables:

- `PORT` (default: `3000`)
- `PIPER_MODEL` (default shown above)

### Piper TTS Models for English

- `/app/models/en_US-lessac-medium.onnx`.
- `/app/models/en_US-ryan-medium.onnx`.
- `/app/models/en_US-libritts_r-medium.onnx`.
- `/app/models/en_US-ljspeech-medium.onnx`.
- `/app/models/en_US-amy-medium.onnx`.
- `/app/models/en_US-joe-medium.onnx`.
- `/app/models/en_US-john-medium.onnx`.
- `/app/models/en_US-kristin-medium.onnx`.

## Test Locally

```bash
cp .env.example .env

./test.sh
```

## Automated Docker Hub release

This repository is configured to auto-release Docker images from `Dockerfile` using Conventional Commits.

- Workflow: `.github/workflows/dockerhub-release.yml`.
- Release config: `.releaserc.json` ([semantic-release](https://www.npmjs.com/package/semantic-release)).
- Trigger: push to `main`.

How versioning works:

| Commit type(s)                                           | Release behavior       |
| -------------------------------------------------------- | ---------------------- |
| `feat:`                                                  | **minor** version bump |
| `fix:` or `perf:`                                        | **patch** version bump |
| `chore:`, `docs:`, `style:`, `refactor:`, `test:`, `ci:` | No release by default  |

For each release, the workflow builds from `Dockerfile` and pushes:

- `9109679196/piper-tts-rest-api:<semantic-version>`
- `9109679196/piper-tts-rest-api:latest`
