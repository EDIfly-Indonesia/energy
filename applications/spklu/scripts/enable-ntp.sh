#!/usr/bin/env bash
# Nyalakan sinkronisasi jam (NTP) di VM ini.
#
#   sudo bash /opt/energy/applications/spklu/scripts/enable-ntp.sh
#
# Kenapa penting untuk SPKLU: server OCPP mengirim `currentTime` di balasan
# BootNotification, jadi jam yang salah akan ditiru oleh mesin charger. Jam
# meleset juga menggeser timestamp transaksi, histori saldo, dan jadwal artikel
# (tgl_terbit <= CURRENT_DATE).
#
# Paket `chrony` sudah terpasang di VM ini, tetapi unit chrony.service gagal
# start dengan Result=resources (prosesnya tidak pernah jalan). Skrip ini
# mencoba perbaikan berurutan dan berhenti di langkah pertama yang berhasil.

set -uo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Skrip ini butuh root. Jalankan: sudo bash $0" >&2
  exit 1
fi

echo "== Keadaan awal =="
timedatectl | sed -n '1,8p'
echo

echo "== 1. Bersihkan status gagal =="
systemctl reset-failed chrony.service 2>/dev/null || true

echo "== 2. Coba start chrony =="
systemctl start chrony.service 2>/dev/null || true
sleep 2

if systemctl is-active --quiet chrony.service; then
  echo "   chrony AKTIF"
else
  echo "   chrony masih gagal. Detail:"
  systemctl status chrony.service --no-pager -l 2>&1 | sed -n '1,12p'
  journalctl -u chrony.service -n 25 --no-pager 2>&1 | tail -25

  echo
  echo "== 3. Coba daemon-reexec (systemd di VM ini sudah lama hidup) =="
  systemctl daemon-reexec 2>/dev/null || true
  sleep 2
  systemctl reset-failed chrony.service 2>/dev/null || true
  systemctl start chrony.service 2>/dev/null || true
  sleep 3
fi

if ! systemctl is-active --quiet chrony.service; then
  echo
  echo "== 4. Fallback: pakai systemd-timesyncd =="
  echo "   (chrony di-disable dulu supaya tidak bentrok)"
  systemctl disable --now chrony.service 2>/dev/null || true
  apt-get update -qq 2>/dev/null || true
  DEBIAN_FRONTEND=noninteractive apt-get install -y systemd-timesyncd 2>&1 | tail -3
  systemctl enable --now systemd-timesyncd 2>/dev/null || true
  sleep 3
fi

echo
echo "== 5. Aktifkan NTP di systemd =="
timedatectl set-ntp true 2>/dev/null || true
sleep 1

echo
echo "== 6. Paksa sinkron sekarang (kalau selisihnya besar) =="
if systemctl is-active --quiet chrony.service; then
  # makestep sudah ada di chrony.conf (makestep 1 3), tapi picu sekali lagi.
  chronyc makestep 2>&1 || true
  sleep 2
  echo
  echo "-- chronyc tracking --"
  chronyc tracking 2>&1 | sed -n '1,8p'
  echo
  echo "-- chronyc sources --"
  chronyc sources 2>&1 | sed -n '1,8p'
elif systemctl is-active --quiet systemd-timesyncd.service; then
  echo "-- timedatectl timesync-status --"
  timedatectl timesync-status 2>&1 | sed -n '1,10p'
fi

echo
echo "== Keadaan akhir =="
timedatectl | sed -n '1,8p'

if timedatectl show 2>/dev/null | grep -q "^NTPSynchronized=yes"; then
  echo
  echo "HASIL: jam sudah tersinkron."
  exit 0
else
  echo
  echo "HASIL: BELUM tersinkron. Tunggu 30-60 detik lalu cek ulang:"
  echo "  timedatectl show | grep NTPSynchronized"
  echo "Kalau tetap 'no', kirim keluaran perintah di atas."
  exit 1
fi
