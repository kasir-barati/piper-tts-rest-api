# Markdown to Audio Converter

A dockerized Node.js application that converts markdown files to audio files using text-to-speech (TTS). Built with Node.js 24.13, pnpm, and **espeak-ng** for offline, lightweight voice synthesis.

## Features

- ✅ Converts markdown to plain text, stripping all formatting
- ✅ Generates WAV audio files using espeak-ng
- ✅ Runs in Docker container with user ID 1000 for proper file permissions
- ✅ Mounts host directories so output files are accessible without `chown`
- ✅ Processes multiple markdown files in batch
- ✅ **Completely offline** - no internet required!
- ✅ **Only 1 npm dependency** (marked)

## Voice Quality

### Current Implementation: espeak-ng

This project uses **espeak-ng**, a lightweight, open-source speech synthesizer that:
- ✅ Works completely offline
- ✅ Fast processing (generates audio quickly)
- ✅ Small Docker image size
- ✅ No external dependencies or API keys needed
- ⚠️  More robotic/synthetic voice quality

### Comparison with Other TTS Options

| TTS Engine | Quality | Speed | Setup | Internet | Cost |
|------------|---------|-------|-------|----------|------|
| **espeak-ng** (current) | ⭐⭐ | ⚡⚡⚡⚡ | Easy | Offline | Free |
| Chrome "Listen to this page" | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | N/A | Online | Free |
| Google Cloud TTS (Neural2) | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | Complex | Online | $4-16/1M chars |
| Piper TTS | ⭐⭐⭐⭐ | ⚡⚡⚡⚡ | Complex | Offline | Free |
| Amazon Polly (Neural) | ⭐⭐⭐⭐ | ⚡⚡⚡ | Medium | Online | Paid |
| ElevenLabs | ⭐⭐⭐⭐⭐ | ⚡⚡ | Easy | Online | Expensive |

**Note:** If you want Chrome-quality voices, you would need to use Google Cloud Text-to-Speech API with Neural2 or WaveNet voices, which require API keys and incur costs.

## Project Structure

```
.
├── Dockerfile              # Docker configuration with espeak-ng
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
3. **Converts text to speech** using espeak-ng
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
- **espeak-ng**: Speech synthesizer
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

Edit `index.js` to customize espeak-ng parameters:

```javascript
// Current settings:
// -v en-us: US English voice
// -s 150: Speaking speed (150 words per minute)
const command = `espeak-ng -v en-us -s 150 -w "${outputFile}" -f "${tempTextFile}"`;
```

**Available voices**: en, en-us, en-gb, en-scottish, and many more languages
**Speed range**: 80-450 words per minute (default: 175)

### Other espeak-ng Options

- `-a <0-200>`: Amplitude/volume (default: 100)
- `-p <0-99>`: Pitch (default: 50)
- `-g <0-??ms>`: Gap between words in milliseconds

Example for a deeper, slower voice:
```javascript
const command = `espeak-ng -v en-us -s 130 -p 30 -w "${outputFile}" -f "${tempTextFile}"`;
```

## Upgrading to Higher Quality TTS

If you want better voice quality similar to Chrome's "Listen to this page":

### Option A: Use Google Cloud TTS
1. Sign up for Google Cloud Platform
2. Enable Text-to-Speech API
3. Get API credentials
4. Replace espeak-ng with `@google-cloud/text-to-speech` npm package
5. Use Neural2 voices (e.g., `en-US-Neural2-F`)

### Option B: Use Piper TTS (Open Source, High Quality)
1. More complex setup with Wyoming protocol
2. Requires downloading ~60MB voice models
3. Quality rivals commercial TTS
4. Still completely free and offline

## Technical Notes

- **Audio Format**: WAV (uncompressed, high quality)
- **Sample Rate**: 22050 Hz (espeak-ng default)
- **Channels**: Mono
- **File Sizes**: Approximately 3-4MB per minute of audio
- **Processing Speed**: Very fast - processes long texts in seconds

## Why espeak-ng?

We chose espeak-ng for this project because:
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
