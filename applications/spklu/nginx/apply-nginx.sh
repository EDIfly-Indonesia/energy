#!/usr/bin/env bash
# Terapkan routing SPKLU ke konfigurasi nginx site `energy` (energy.edifly-si.com).
# Jalankan:  sudo bash /opt/energy/applications/spklu/nginx/apply-nginx.sh
set -euo pipefail

SNIPPET=/opt/energy/applications/spklu/nginx/spklu.conf
TARGET=/etc/nginx/sites-available/energy
TS=$(date +%Y%m%d%H%M%S)

# 1. Jangan sisipkan dua kali
if grep -q "SPKLU (GoCaz)" "$TARGET" 2>/dev/null; then
  echo "SPKLU block sudah ada di $TARGET — skip insert."
else
  cp "$TARGET" "$TARGET.bak.$TS"
  echo "Backup: $TARGET.bak.$TS"

  # Sisipkan isi SNIPPET tepat sebelum kurung-tutup `server {}` SSL pertama
  # (baris yang dimulai dengan "}" di kolom 0).
  awk 'NR==FNR { s[++n]=$0; next }
       /^}/ && !done { for (i=1;i<=n;i++) print s[i]; done=1 }
       { print }' "$SNIPPET" "$TARGET" > /tmp/energy.nginx.new
  mv /tmp/energy.nginx.new "$TARGET"
  echo "SPKLU block disisipkan ke $TARGET"
fi

# 2. Validasi + reload
nginx -t
systemctl reload nginx
echo "nginx reloaded OK"
