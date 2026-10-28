#!/usr/bin/env bash
# Sisipkan blok OCPP WebSocket (wss) ke site nginx `energy` yang sedang LIVE.
#
#   sudo bash /opt/energy/applications/spklu/nginx/apply-ocpp-wss.sh
#
# Hasil: mesin charger bisa memakai
#   wss://energy.edifly-si.com/ocpp/<chargebox_id>
# tanpa perlu membuka port 8080 ke internet.
#
# Aman dijalankan berulang: kalau blok sudah ada, skrip hanya memvalidasi.

set -euo pipefail

SNIPPET=/opt/energy/applications/spklu/nginx/ocpp-wss.conf
TARGET=/etc/nginx/sites-available/energy
TS=$(date +%Y%m%d%H%M%S)

if [ "$(id -u)" -ne 0 ]; then
  echo "Skrip ini butuh root. Jalankan: sudo bash $0" >&2
  exit 1
fi

if [ ! -f "$SNIPPET" ]; then
  echo "Snippet tidak ditemukan: $SNIPPET" >&2
  exit 1
fi

if grep -q "location /ocpp/" "$TARGET" 2>/dev/null; then
  echo "Blok /ocpp/ sudah ada di $TARGET - tidak disisipkan ulang."
else
  cp "$TARGET" "$TARGET.bak.$TS"
  echo "Backup: $TARGET.bak.$TS"

  # Sisipkan tepat SEBELUM penutup server block SSL, yaitu sebelum baris
  # terakhir yang berisi "}" di kolom 0 pada server block 443.
  #
  # Anchor yang dipakai: location /fonts/ — blok terakhir di dalam server 443
  # pada konfigurasi saat ini. Kalau anchor tidak ketemu, skrip berhenti
  # daripada menyisipkan di tempat yang salah.
  python3 - "$TARGET" "$SNIPPET" <<'PY'
import sys

target, snippet = sys.argv[1], sys.argv[2]
lines = open(target).read().split('\n')
block = open(snippet).read().rstrip('\n').split('\n')

anchor = None
for i, line in enumerate(lines):
    if line.strip().startswith('location /fonts/'):
        anchor = i

if anchor is None:
    raise SystemExit(
        'Anchor "location /fonts/" tidak ditemukan di ' + target +
        '. Periksa manual: sisipkan isi ' + snippet +
        ' sebelum penutup server block 443.'
    )

# Cari penutup blok /fonts/ (kurung kurawal seimbang), lalu sisipkan sesudahnya.
depth = 0
started = False
end = None
for j in range(anchor, len(lines)):
    depth += lines[j].count('{') - lines[j].count('}')
    if '{' in lines[j]:
        started = True
    if started and depth == 0:
        end = j
        break

if end is None:
    raise SystemExit('Penutup blok /fonts/ tidak ditemukan; batal menyisipkan.')

new = lines[:end + 1] + [''] + block + lines[end + 1:]
open(target, 'w').write('\n'.join(new))
print('Blok /ocpp/ disisipkan setelah location /fonts/ (baris %d).' % (end + 1))
PY
fi

echo
echo "== Validasi konfigurasi =="
nginx -t

echo
echo "== Reload nginx =="
systemctl reload nginx
echo "nginx reloaded OK"

echo
echo "== Cek endpoint dari dalam VM =="
# Upgrade header disimulasikan; 400/426 dari backend berarti jalur sudah tembus
# (backend menolak handshake karena bukan WebSocket asli, bukan karena 404).
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 \
  -H 'Connection: Upgrade' -H 'Upgrade: websocket' \
  -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' \
  -H 'Sec-WebSocket-Protocol: ocpp1.6' \
  --resolve energy.edifly-si.com:443:127.0.0.1 \
  https://energy.edifly-si.com/ocpp/EZ81920 || true)

case "$code" in
  101|400|426) echo "Jalur /ocpp/ tembus (HTTP $code) - siap dipakai mesin." ;;
  404)         echo "HTTP 404: chargebox EZ81920 tidak ada di t_chargebox." ;;
  502|503|504) echo "HTTP $code: backend tidak menjawab. Cek: pm2 list | grep spklu-backend" ;;
  *)           echo "HTTP $code: periksa manual." ;;
esac

echo
echo "Selesai. URL mesin: wss://energy.edifly-si.com/ocpp/<chargebox_id>"
