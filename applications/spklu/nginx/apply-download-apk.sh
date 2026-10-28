#!/usr/bin/env bash
# Tambahkan lokasi /spklu/download_apk/ ke site nginx `energy` yang sedang LIVE.
# Jalankan dengan sudo (butuh password):
#   sudo bash /opt/energy/applications/spklu/nginx/apply-download-apk.sh
set -euo pipefail

TARGET=/etc/nginx/sites-available/energy
TS=$(date +%Y%m%d%H%M%S)

if grep -q 'location /spklu/download_apk/' "$TARGET" 2>/dev/null; then
  echo "Lokasi download_apk sudah ada di $TARGET — skip insert."
else
  cp "$TARGET" "$TARGET.bak.$TS"
  echo "Backup: $TARGET.bak.$TS"
  python3 - "$TARGET" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
block = '''
    # --- APK download + version check (self-update Android) ---
    location = /spklu/download_apk/version.json {
        alias /opt/energy/applications/spklu/apk/version.json;
        default_type application/json;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
        add_header Access-Control-Allow-Origin "*";
    }
    location /spklu/download_apk/ {
        alias /opt/energy/applications/spklu/apk/;
        types { application/vnd.android.package-archive apk; }
        default_type application/octet-stream;
        add_header Cache-Control "no-cache";
    }
'''
anchor = '    # --- Dashboard React'
if anchor not in s:
    raise SystemExit('anchor "Dashboard React" tidak ditemukan di ' + p)
s = s.replace(anchor, block + anchor, 1)
open(p, 'w').write(s)
print('Lokasi download_apk disisipkan ke ' + p)
PY
fi

nginx -t
systemctl reload nginx
echo "nginx reloaded OK"
