#!/usr/bin/env bash
# Rebuild image with NEXT_PUBLIC_* from .env.local, then restart the quadlet.
# Usage on VPS: bash deploy/rebuild-and-restart.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/apps/google-map-test}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.local}"

cd "$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

if [[ -z "${NEXT_PUBLIC_POSTHOG_TOKEN:-}" ]]; then
  echo "NEXT_PUBLIC_POSTHOG_TOKEN is not set in $ENV_FILE" >&2
  exit 1
fi

bash deploy/ensure-production-env.sh "$ENV_FILE"

echo "Building with PostHog token (${#NEXT_PUBLIC_POSTHOG_TOKEN} chars)..."
podman build \
  --build-arg "NEXT_PUBLIC_POSTHOG_TOKEN=${NEXT_PUBLIC_POSTHOG_TOKEN}" \
  -t localhost/google-map-test:latest \
  .

systemctl --user daemon-reload
systemctl --user restart google-map-test.service
sleep 5
systemctl --user is-active google-map-test.service
echo "Done."
