#!/usr/bin/env fish
# Create a Google Maps API key via gcloud (run after: gcloud auth login)
#
# Prerequisites:
#   1. Google Cloud project with billing enabled
#   2. gcloud installed (~/google-cloud-sdk) and logged in
#
# Usage:
#   fish scripts/google-maps-api-key.fish
#   fish scripts/google-maps-api-key.fish --project my-gcp-project-id

set -l GCLOUD "$HOME/google-cloud-sdk/bin/gcloud"
if not test -x $GCLOUD
    echo "error: gcloud not found at $GCLOUD" >&2
    echo "Install: https://cloud.google.com/sdk/docs/install" >&2
    exit 1
end

set -l PROJECT ""
if contains -- --project $argv
    set -l i (contains --index -- --project $argv)
    set PROJECT $argv[(math $i + 1)]
end

# --- auth ---
set -l accounts ($GCLOUD auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
if test (count $accounts) -eq 0
    echo ""
    echo "Not logged in. Run this in your terminal (browser will open):"
    echo "  $GCLOUD auth login"
    echo ""
    echo "Or without browser auto-open:"
    echo "  $GCLOUD auth login --no-launch-browser"
    echo ""
    exit 1
end
echo "Logged in as: $accounts[1]"

# --- project ---
if test -z "$PROJECT"
    set -l projects ($GCLOUD projects list --format="value(projectId)" 2>/dev/null | head -20)
    if test (count $projects) -eq 0
        echo "error: no GCP projects found for this account." >&2
        echo "Create one: https://console.cloud.google.com/projectcreate" >&2
        exit 1
    end
    if test (count $projects) -eq 1
        set PROJECT $projects[1]
        echo "Using project: $PROJECT"
    else
        echo "Available projects:"
        for p in $projects
            echo "  - $p"
        end
        read -P "GCP project ID: " PROJECT
    end
end

$GCLOUD config set project $PROJECT

set -l KEY_NAME "google-map-test-dev"
set -l REFERRERS "http://localhost:*/*,http://127.0.0.1:*/*"

echo ""
echo "Enabling Maps Platform APIs on $PROJECT ..."
for api in maps-backend.googleapis.com geocoding-backend.googleapis.com places-backend.googleapis.com static-maps-backend.googleapis.com maps-embed-backend.googleapis.com
    $GCLOUD services enable $api --project=$PROJECT 2>/dev/null
end

echo "Creating API key ($KEY_NAME) ..."
set -l create_out ($GCLOUD services api-keys create \
    --project=$PROJECT \
    --display-name=$KEY_NAME \
    --api-target=service=maps-backend.googleapis.com \
    --api-target=service=geocoding-backend.googleapis.com \
    --api-target=service=places-backend.googleapis.com \
    --api-target=service=static-maps-backend.googleapis.com \
    --api-target=service=maps-embed-backend.googleapis.com \
    --allowed-referrers=$REFERRERS \
    --format="value(name)" 2>&1)

if test $status -ne 0
    echo "error: failed to create API key" >&2
    echo $create_out >&2
    echo "" >&2
    echo "Common fixes:" >&2
    echo "  - Enable billing: https://console.cloud.google.com/billing" >&2
    echo "  - Grant API Keys Admin on the project" >&2
    exit 1
end

# Create may return an operation id; resolve the key by display name.
set -l key_resource ""
for _ in (seq 1 10)
    set key_resource ($GCLOUD services api-keys list --project=$PROJECT \
        --filter="displayName:$KEY_NAME" --format="value(name)" 2>/dev/null | head -1)
    if test -n "$key_resource"
        break
    end
    sleep 2
end
if test -z "$key_resource"
    echo "error: API key created but resource name not found yet" >&2
    exit 1
end

set -l key_string ""
for _ in (seq 1 10)
    set key_string ($GCLOUD services api-keys get-key-string $key_resource \
        --project=$PROJECT --format="value(keyString)" 2>/dev/null)
    if test -n "$key_string"
        break
    end
    sleep 2
end
if test -z "$key_string"
    echo "error: could not fetch key string for $key_resource" >&2
    exit 1
end

set -l env_file (dirname (status dirname))/.env.local
if not test -f $env_file
    printf '%s\n' "# Google Maps Platform (scripts/google-maps-api-key.fish)" > $env_file
end
for var in GOOGLE_MAPS_API_KEY NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if grep -q "^$var=" $env_file 2>/dev/null
        sed -i "s|^$var=.*|$var=$key_string|" $env_file
    else
        printf '%s\n' "$var=$key_string" >> $env_file
    end
end

echo ""
echo "Done."
echo "  Project:  $PROJECT"
echo "  Key name: $KEY_NAME"
echo "  Saved to: $env_file"
echo ""
echo "Restrict further in console if needed:"
echo "  https://console.cloud.google.com/google/maps-apis/credentials?project=$PROJECT"
