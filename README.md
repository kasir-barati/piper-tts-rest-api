# Markdown to Audio Converter

A dockerized Node.js application that converts markdown files to MP3 audio files using text-to-speech (TTS). Built with Node.js 24.13 and pnpm.

## Features

- Converts markdown to plain text, stripping all formatting
- Generates MP3 audio files using Google Text-to-Speech
- Runs in Docker container with user ID 1000 for proper file permissions
- Mounts host directories so output files are accessible without `chown`
- Processes multiple markdown files in batch

## Project Structure

```
.
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose configuration
├── package.json            # Node.js dependencies (using pnpm)
├── index.js                # Main application
├── run.sh                  # Convenience script to build and run
├── input/                  # Input markdown files directory
│   ├── easy.md            # Simple sci-fi content
│   ├── normal.md          # Medium complexity sci-fi article
│   └── difficult.md       # Complex academic-style sci-fi paper
└── output/                 # Generated MP3 files (created automatically)
    ├── easy.mp3
    ├── normal.mp3
    └── difficult.mp3
```

## Usage

### Option 1: Using the convenience script (recommended)

```bash
chmod +x run.sh
./run.sh
```

### Option 2: Using Docker commands directly

```bash
# Build the image
docker build -t markdown-to-audio .

# Run the container
docker run --rm -u 1000:1000 \
  -v "$(pwd)/input:/app/input:ro" \
  -v "$(pwd)/output:/app/output" \
  markdown-to-audio
```

### Option 3: Using Docker Compose (recommended)

```bash
# Build and run
docker compose up --build

# Or run without rebuild
docker compose up
```

The docker-compose setup includes an init service that automatically creates the output directory with correct permissions (user 1000:1000).

## How It Works

1. **Reads markdown files** from the `input/` directory
2. **Strips markdown formatting** to extract plain text
3. **Converts text to speech** using Google TTS
4. **Saves MP3 files** to the `output/` directory

The container runs as user 1000:1000, ensuring that generated files on the host have the correct ownership without requiring `chown`.

## Sample Content

The project includes three sci-fi themed markdown files:

- **easy.md**: A simple introduction to a space colony (Kepler-442b)
- **normal.md**: A detailed article about interstellar travel technology
- **difficult.md**: A complex academic paper on relativistic time dilation in multi-generational starship journeys

## Dependencies

- **marked**: Markdown parser
- **gtts**: Google Text-to-Speech library
- **pnpm**: Fast, disk-efficient package manager

## Requirements

- Docker
- (Optional) Docker Compose

## Adding Your Own Markdown Files

Simply add `.md` files to the `input/` directory and run the application. The converter will automatically process all markdown files and generate corresponding MP3 files.

**Note**: For best results, use markdown files with text content only (no code blocks or images).

## Volume Mounting

The application uses two volume mounts:

- `./input:/app/input:ro` - Read-only access to input markdown files
- `./output:/app/output` - Read-write access for generated MP3 files

The `:ro` flag on the input mount ensures the container cannot modify your source markdown files.
