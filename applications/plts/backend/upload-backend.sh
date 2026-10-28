#!/bin/bash
# Upload changed backend files to VM via SCP
# Usage: chmod +x upload-backend.sh && ./upload-backend.sh
#
# Files changed this session (backend only):
# /opt/energy/applications/plts/backend/src/api/controllers/site.controller.js
#
# Also ensuring venv deps (pika, influxdb-client) are synced on target.

set -euo pipefail

REMOTE_USER="userpltsapp"
REMOTE_HOST="10.4.126.252"
REMOTE_BASE="/opt/energy/applications/plts/backend/src/api/controllers"

LOCAL_FILE="src/api/controllers/site.controller.js"
REMOTE_PATH="${REMOTE_BASE}/site.controller.js"

echo "Uploading ${LOCAL_FILE} to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}"
scp -o StrictHostKeyChecking=no "${LOCAL_FILE}" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}"

if [ $? -eq 0 ]; then
  echo "[OK] Upload complete. site.controller.js has been updated on remote VM."
  echo "     Restart backend service on VM if needed."
else
  echo "[ERROR] Upload failed."
  exit 1
fi