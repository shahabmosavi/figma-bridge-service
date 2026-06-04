#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${VPS_APP_DIR:-/home/projects/n8nflow}"
IMAGE_NAME="${FIGMA_BRIDGE_IMAGE:-ghcr.io/shahabmosavi/figma-bridge-service:latest}"

cd "$APP_DIR"

echo "Deploying figma-bridge-service from $APP_DIR"
echo "Using image: $IMAGE_NAME"

export FIGMA_BRIDGE_IMAGE="$IMAGE_NAME"

docker pull "$FIGMA_BRIDGE_IMAGE"
docker compose pull
docker compose up -d

docker compose ps
docker compose logs --tail=80 figma-bridge-service
