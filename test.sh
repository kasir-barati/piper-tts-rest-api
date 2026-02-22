#!/usr/bin/env bash

docker compose up --build -d

# Wait for API readiness
until curl -sf http://localhost:3000/health >/dev/null; do
	sleep 1
done

curl -f \
	-X POST http://localhost:3000/speak \
	-H 'content-type: application/json' \
	-d '{"text":"Hello from a single command test"}' \
	-o hello-world.mp3

ls -lh hello-world.mp3

docker compose down
