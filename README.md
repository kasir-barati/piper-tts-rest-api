# Piper TTS RESTful API

Dockerized Node.js (ESM) RESTful API for offline text-to-speech using Piper TTS.

## API documentation

### 1) Health check

- Method: `GET`
- Path: `/health`
- Success response:
  - Status: `200`
  - Content-Type: `text/plain`
  - Body: `OK`

Example:

```bash
curl -i http://localhost:3000/health
```

### 2) Text to speech

- Method: `POST`
- Path: `/speak`
- Supported body formats:
  - `application/json` with `{ "text": "..." }`
  - `text/plain` with raw text body

Success response:

- Status: `200`
- Content-Type: `audio/mpeg`
- Headers include:
  - `Content-Disposition: attachment; filename="<generated>.mp3"`
  - `X-Output-File: <generated>.mp3`
- Body: MP3 binary

Validation and errors:

- `400` for invalid JSON or missing/empty text
- `413` when payload exceeds max allowed size
- `500` for synthesis/transcoding failures

Examples:

```bash
# JSON input
curl -X POST http://localhost:3000/speak \
  -H 'content-type: application/json' \
  -d '{"text":"Hello from Piper API"}' \
  -o output.mp3

# Plain text input
curl -X POST http://localhost:3000/speak \
  -H 'content-type: text/plain' \
  --data 'Hello from plain text body' \
  -o output.mp3
```

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

## License

MIT
