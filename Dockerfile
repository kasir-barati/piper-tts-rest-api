FROM node:24.13-bookworm-slim

# Install pnpm, Piper TTS and runtime dependencies
RUN apt-get update && \
        apt-get install -y --no-install-recommends \
            ca-certificates \
            curl \
            python3 \
            python3-pip \
            python3-venv && \
        rm -rf /var/lib/apt/lists/* && \
        npm install -g pnpm && \
        python3 -m venv /opt/piper-venv && \
        /opt/piper-venv/bin/pip install --no-cache-dir --upgrade pip && \
        /opt/piper-venv/bin/pip install --no-cache-dir piper-tts pathvalidate

# Make Piper CLI available on PATH
ENV PATH="/opt/piper-venv/bin:${PATH}"

# Set working directory
WORKDIR /app

# Download a default Piper voice model
RUN mkdir -p /app/models && \
        curl -L -o /app/models/en_US-lessac-medium.onnx \
            https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx && \
        curl -L -o /app/models/en_US-lessac-medium.onnx.json \
            https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy application files
COPY index.js ./

# Create output directory with proper permissions
RUN mkdir -p /app/output && \
    chown -R 1000:1000 /app

# Switch to user 1000
USER 1000:1000

# Default Piper model path (can be overridden)
ENV PIPER_MODEL=/app/models/en_US-lessac-medium.onnx

# Run the application
CMD ["pnpm", "start"]
