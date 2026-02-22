FROM node:24.13-alpine

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

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

# Run the application
CMD ["pnpm", "start"]
