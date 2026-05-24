#!/usr/bin/env bash
# Deprecated: use deploy/setup-gcp-monitoring-sa.sh (service account JSON) instead.
# Copy local gcloud Application Default Credentials to the VPS for quota guard + /maps-usage.
# Prerequisite on your machine: gcloud auth application-default login
echo "Use: bash deploy/setup-gcp-monitoring-sa.sh" >&2
exit 1
set -euo pipefail

VPS_HOST="${VPS_HOST:-ubuntu@100.117.130.2}"
REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/apps/google-map-test/gcp}"
LOCAL_ADC="${LOCAL_ADC:-$HOME/.config/gcloud/application_default_credentials.json}"

if [[ ! -f "$LOCAL_ADC" ]]; then
  echo "Missing $LOCAL_ADC — run: gcloud auth application-default login" >&2
  exit 1
fi

ssh "$VPS_HOST" "mkdir -p $REMOTE_DIR && chmod 700 $REMOTE_DIR"
scp "$LOCAL_ADC" "$VPS_HOST:$REMOTE_DIR/application_default_credentials.json"
# Container runs as nextjs (uid 100); file must be world-readable on the mount.
ssh "$VPS_HOST" "chmod 644 $REMOTE_DIR/application_default_credentials.json"

echo "Copied ADC to $VPS_HOST:$REMOTE_DIR/application_default_credentials.json"
echo "Restart on VPS: systemctl --user daemon-reload && systemctl --user restart google-map-test.service"
