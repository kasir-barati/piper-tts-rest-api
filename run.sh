#!/bin/bash

echo "=== Building Docker Image ==="
docker build -t markdown-to-audio .

echo ""
echo "=== Running Markdown to Audio Converter ==="
docker run --rm -u 1000:1000 -v "$(pwd)/input:/app/input:ro" -v "$(pwd)/output:/app/output" markdown-to-audio

echo ""
echo "=== Done! ==="
echo "Check the ./output directory for generated WAV files."
