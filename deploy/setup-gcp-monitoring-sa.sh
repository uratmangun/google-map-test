#!/usr/bin/env bash
# Service account for quota guard + /maps-usage (Cloud Monitoring read-only).
# One-time: creates SA + roles/monitoring.viewer + JSON key in ./gcp/monitoring-sa.json
# Deploy: copies key to VPS and restarts google-map-test (see deploy/google-map-test.container).
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-coba-409011}"
SA_ID="${GCP_MONITORING_SA_ID:-maps-quota-monitoring}"
SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
VPS_HOST="${VPS_HOST:-ubuntu@100.117.130.2}"
REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/apps/google-map-test/gcp}"
LOCAL_KEY="${LOCAL_KEY:-$(cd "$(dirname "$0")/.." && pwd)/gcp/monitoring-sa.json}"
CREATE="${CREATE:-0}"

if [[ "$CREATE" == "1" ]]; then
  echo "Creating service account $SA_EMAIL on $PROJECT_ID ..."
  gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" 2>/dev/null ||
    gcloud iam service-accounts create "$SA_ID" \
      --project="$PROJECT_ID" \
      --display-name="Maps quota guard + usage monitoring"

  echo "Granting roles/monitoring.viewer ..."
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/monitoring.viewer" \
    --condition=None \
    --quiet >/dev/null

  mkdir -p "$(dirname "$LOCAL_KEY")"
  echo "Creating key at $LOCAL_KEY ..."
  gcloud iam service-accounts keys create "$LOCAL_KEY" \
    --iam-account="$SA_EMAIL" \
    --project="$PROJECT_ID"
  chmod 600 "$LOCAL_KEY"
fi

if [[ ! -f "$LOCAL_KEY" ]]; then
  echo "Missing $LOCAL_KEY — run: CREATE=1 bash deploy/setup-gcp-monitoring-sa.sh" >&2
  exit 1
fi

ssh "$VPS_HOST" "mkdir -p $REMOTE_DIR && chmod 700 $REMOTE_DIR"
scp "$LOCAL_KEY" "$VPS_HOST:$REMOTE_DIR/monitoring-sa.json"
# Container runs as nextjs (uid 100); mount must be world-readable.
ssh "$VPS_HOST" "chmod 644 $REMOTE_DIR/monitoring-sa.json"

echo "Deployed $LOCAL_KEY → $VPS_HOST:$REMOTE_DIR/monitoring-sa.json"
echo "Restart: ssh $VPS_HOST 'systemctl --user daemon-reload && systemctl --user restart google-map-test.service'"
