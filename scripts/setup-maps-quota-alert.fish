#!/usr/bin/env fish
# Create Maps free-tier Monitoring alert via gcloud (alternative to /maps-usage UI).
#
# Prerequisites:
#   gcloud auth application-default login
#   Roles: monitoring.alertPolicyEditor, monitoring.notificationChannelEditor
#
# Usage:
#   fish scripts/setup-maps-quota-alert.fish
#   fish scripts/setup-maps-quota-alert.fish --project koisose-65e33

set -l GCLOUD "$HOME/google-cloud-sdk/bin/gcloud"
set -l PROJECT "koisose-65e33"
set -l EMAIL "koisose0@gmail.com"
set -l POLICY_NAME "google-map-test-free-tier-80pct"
set -l THRESHOLD 8000

if contains -- --project $argv
    set -l i (contains --index -- --project $argv)
    set PROJECT $argv[(math $i + 1)]
end

if not test -x $GCLOUD
    echo "error: gcloud not found" >&2
    exit 1
end

echo "Project: $PROJECT"
echo "Alert email: $EMAIL"
echo "Threshold: $THRESHOLD requests/month per API"
echo ""
echo "Prefer the web UI: pnpm dev → http://localhost:3000/maps-usage"
echo "Or create policy JSON in Console: Monitoring → Alerting"
echo ""
echo "Listing existing alert policies..."
$GCLOUD monitoring policies list --project=$PROJECT --format="table(displayName,name)" 2>/dev/null | grep -i google-map-test; or true

echo ""
echo "To create via API, use POST /api/maps/alerts from the running dev server."
echo "CLI policy JSON varies by API version; the Next.js route uses Monitoring REST."
