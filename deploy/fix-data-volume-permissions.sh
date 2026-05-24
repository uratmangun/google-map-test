#!/usr/bin/env bash
# Rootless Podman maps container nextjs (uid 100, gid 101) to host subuid/subgid.
# Run on VPS after creating the data volume so Better Auth SQLite is writable.
set -euo pipefail

DATA_DIR="${1:-/home/ubuntu/apps/google-map-test/data}"
USER_NAME="${USER_NAME:-ubuntu}"

subuid_line=$(grep "^${USER_NAME}:" /etc/subuid | head -1)
subgid_line=$(grep "^${USER_NAME}:" /etc/subgid | head -1)
if [[ -z "$subuid_line" || -z "$subgid_line" ]]; then
  echo "Missing subuid/subgid for ${USER_NAME}" >&2
  exit 1
fi

subuid_start=$(echo "$subuid_line" | cut -d: -f2)
subgid_start=$(echo "$subgid_line" | cut -d: -f2)
# Container USER nextjs / GROUP nodejs in Dockerfile
host_uid=$((subuid_start + 100 - 1))
host_gid=$((subgid_start + 101 - 1))

sudo mkdir -p "$DATA_DIR"
sudo chown -R "${host_uid}:${host_gid}" "$DATA_DIR"
sudo chmod 775 "$DATA_DIR"
if compgen -G "${DATA_DIR}/*" >/dev/null; then
  sudo chmod 664 "${DATA_DIR}"/*
fi

echo "Set ${DATA_DIR} → ${host_uid}:${host_gid} (container nextjs:nodejs)"
ls -la "$DATA_DIR"
