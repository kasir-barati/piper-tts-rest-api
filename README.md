# Markdown to Audio Converter

A dockerized Node.js application that converts markdown files to audio files using text-to-speech (TTS). Built with Node.js 24.13, pnpm, and **Piper TTS** for offline neural voice synthesis.

## Features

- ✅ Converts markdown to plain text, stripping all formatting
- ✅ Generates WAV audio files using Piper TTS
- ✅ Runs in Docker container with user ID 1000 for proper file permissions
- ✅ Mounts host directories so output files are accessible without `chown`
- ✅ Processes multiple markdown files in batch
- ✅ **Completely offline** - no internet required!
- ✅ **Only 1 npm dependency** (marked)

## Voice Quality

### Current Implementation: Piper TTS

This project uses **Piper TTS**, a lightweight, open-source neural speech synthesizer that:
- ✅ Works completely offline
- ✅ Fast processing (generates audio quickly)
- ✅ Small Docker image size
- ✅ No external dependencies or API keys needed
- ⚠️  More robotic/synthetic voice quality

### Comparison with Other TTS Options

| TTS Engine | Quality | Speed | Setup | Internet | Cost |
|------------|---------|-------|-------|----------|------|
| **Piper TTS** (current) | ⭐⭐⭐⭐ | ⚡⚡⚡⚡ | Medium | Offline | Free |
| Chrome "Listen to this page" | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | N/A | Online | Free |
| Google Cloud TTS (Neural2) | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | Complex | Online | $4-16/1M chars |
| Piper TTS | ⭐⭐⭐⭐ | ⚡⚡⚡⚡ | Complex | Offline | Free |
| Amazon Polly (Neural) | ⭐⭐⭐⭐ | ⚡⚡⚡ | Medium | Online | Paid |
| ElevenLabs | ⭐⭐⭐⭐⭐ | ⚡⚡ | Easy | Online | Expensive |

**Note:** If you want Chrome-quality voices, you would need to use Google Cloud Text-to-Speech API with Neural2 or WaveNet voices, which require API keys and incur costs.

## Project Structure

```
.
├── Dockerfile              # Docker configuration with Piper TTS
├── docker-compose.yml      # Docker Compose configuration
├── package.json            # Node.js dependencies (only 'marked')
├── index.js                # Main application
├── run.sh                  # Convenience script to build and run
├── input/                  # Input markdown files directory
│   ├── easy.md            # Simple sci-fi content
│   ├── normal.md          # Medium complexity sci-fi article
│   └── difficult.md       # Complex academic-style sci-fi paper
└── output/                 # Generated audio files (created automatically)
    ├── easy.wav           # ~4MB
    ├── normal.wav         # ~12MB
    └── difficult.wav      # ~32MB
```

## Usage

### Option 1: Using Docker Compose (recommended)

```bash
# Build and run
docker compose up --build

# Or run without rebuild
docker compose up
```

The docker-compose setup includes an init service that automatically creates the output directory with correct permissions (user 1000:1000).

### Option 2: Using the convenience script

```bash
chmod +x run.sh
./run.sh
```

### Option 3: Using Docker commands directly

```bash
# Build the image
docker build -t markdown-to-audio .

# Run the container
docker run --rm -u 1000:1000 \
  -v "$(pwd)/input:/app/input:ro" \
  -v "$(pwd)/output:/app/output" \
  markdown-to-audio
```

## How It Works

1. **Reads markdown files** from the `input/` directory
2. **Strips markdown formatting** to extract plain text using the `marked` library
3. **Converts text to speech** using Piper TTS
4. **Saves WAV files** to the `output/` directory

The container runs as user 1000:1000, ensuring that generated files on the host have the correct ownership without requiring `chown`.

## Sample Content

The project includes three sci-fi themed markdown files:

- **easy.md**: A simple introduction to a space colony (Kepler-442b) - generates ~4MB WAV
- **normal.md**: A detailed article about interstellar travel technology - generates ~12MB WAV
- **difficult.md**: A complex academic paper on relativistic time dilation - generates ~32MB WAV

## Dependencies

### NPM Dependencies
- **marked**: Markdown parser (only dependency!)

### System Dependencies (in Docker)
- **piper-tts**: Neural speech synthesizer CLI
- **pnpm**: Fast, disk-efficient package manager

## Requirements

- Docker
- (Optional) Docker Compose

## Adding Your Own Markdown Files

Simply add `.md` files to the `input/` directory and run the application. The converter will automatically process all markdown files and generate corresponding WAV files.

**Note**: For best results, use markdown files with text content only (no code blocks or images).

## Volume Mounting

The application uses two volume mounts:

- `./input:/app/input:ro` - Read-only access to input markdown files
- `./output:/app/output` - Read-write access for generated WAV files

The `:ro` flag on the input mount ensures the container cannot modify your source markdown files.

## Customization

### Adjusting Voice Parameters

Edit `index.js` to customize Piper model/voice parameters:

```javascript
// Current settings:
// --model: ONNX voice model path
// --output_file: target WAV file
const piperArgs = ['--model', modelPath, '--output_file', outputFile];
```

**Available voices**: en, en-us, en-gb, en-scottish, and many more languages
**Speed range**: 80-450 words per minute (default: 175)

### Other Piper Options

- `--length_scale <float>`: Speech speed (higher = slower)
- `--noise_scale <float>`: Variation in generated speech
- `--noise_w <float>`: Phoneme width/noise shaping

Example for a slightly slower voice:
```javascript
const piperArgs = [
  '--model', modelPath,
  '--output_file', outputFile,
  '--length_scale', '1.1'
];
```

## Upgrading to Higher Quality TTS

If you want better voice quality similar to Chrome's "Listen to this page":

### Option A: Use Google Cloud TTS
1. Sign up for Google Cloud Platform
2. Enable Text-to-Speech API
3. Get API credentials
4. Replace Piper CLI usage with `@google-cloud/text-to-speech` npm package
5. Use Neural2 voices (e.g., `en-US-Neural2-F`)

### Option B: Use Piper TTS (Open Source, High Quality)
1. More complex setup with Wyoming protocol
2. Requires downloading ~60MB voice models
3. Quality rivals commercial TTS
4. Still completely free and offline

## Technical Notes

- **Audio Format**: WAV (uncompressed, high quality)
- **Sample Rate**: depends on the selected Piper model
- **Channels**: Mono
- **File Sizes**: Approximately 3-4MB per minute of audio
- **Processing Speed**: Very fast - processes long texts in seconds

## Why Piper TTS?

We chose Piper TTS for this project because:
1. **Simplicity**: Single APK package, no complex dependencies
2. **Reliability**: Mature, stable, well-maintained
3. **Offline**: No internet connection required
4. **Speed**: Processes even large documents quickly
5. **Size**: Minimal impact on Docker image size
6. **License**: Free and open source (GPL)

While the voice quality is more synthetic than modern neural TTS, it's perfectly adequate for accessibility purposes, content review, or situations where you want to listen to documents while doing other tasks.

## Troubleshooting

### Files not owned by my user
- The container runs as user 1000:1000
- If your host user has a different UID, you may need to adjust the `user` field in `docker-compose.yml`

### No audio files generated
- Check container logs: `docker compose logs markdown-to-audio`
- Verify markdown files exist in `input/` directory
- Ensure output directory has write permissions

### Audio quality issues
- Try adjusting speed: `-s 150` (slower) or `-s 180` (faster)
- Try different voice: `-v en-gb` for British English
- For higher quality, consider upgrading to Piper TTS or cloud services

## License

MIT

---

**🎙️ Enjoy listening to your markdown files!**
