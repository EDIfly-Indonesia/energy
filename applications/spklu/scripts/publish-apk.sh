#!/usr/bin/env bash
# Publikasikan APK baru ke /spklu/download_apk/ (self-update Android SPKLU).
#
# Pemakaian:
#   publish-apk.sh <apk-file> <versionCode> [versionName] [changelog] [opsi]
#
# Contoh:
#   publish-apk.sh ~/spklu-1.2.0.apk 27 "1.2.0" "Perbaikan bug scan QR"
#   publish-apk.sh ~/spklu-1.3.0.apk 28 "1.3.0" "Wajib update" --min-version-code 28 --force
#
# Opsi:
#   --min-version-code N      ambang wajib-update. Default: PERTAHANKAN nilai rilis
#                             sebelumnya (tidak dinaikkan otomatis).
#   --force                   tandai rilis ini wajib (force: true di version.json).
#   --allow-downgrade         izinkan versionCode sama atau lebih kecil. Darurat saja.
#   --skip-signature-check    lewati verifikasi sertifikat. Darurat saja.
#
# Penjaga yang dijalankan:
#   1. berkas harus ada, ZIP utuh, dan benar-benar APK (AndroidManifest.xml ada)
#   2. versionCode harus integer positif
#   3. versionCode tidak boleh sama/lebih kecil dari rilis terakhir
#      (kecuali --allow-downgrade) — klien membandingkan integer, jadi menurunkan
#      berarti semua pengguna berhenti menerima update
#   4. sertifikat penandatangan harus sama dengan keystore rilis yang diharapkan;
#      APK bertanda tangan lain tidak akan bisa dipasang menimpa versi lama
#   5. rilis sebelumnya (apk + version.json) dicadangkan sebelum ditimpa
#   6. salinan hasil publikasi harus identik dengan sumber (sha256)
#
# Nama berkas publik: ez-charge.apk (atur lewat SPKLU_APK_NAME).
# spklu.apk dipertahankan sebagai symlink kompatibilitas untuk tautan lama.
#
# Lingkungan:
#   SPKLU_BASE_DIR, SPKLU_APK_NAME, SPKLU_EXPECTED_CERT_SHA256, SPKLU_BACKUP_KEEP

set -euo pipefail

BASE_DIR="${SPKLU_BASE_DIR:-/opt/energy/applications/spklu}"
APK_DIR="$BASE_DIR/apk"
BACKUP_DIR="$APK_DIR/backup"
# Nama berkas publik. Diganti dari `spklu.apk` (nama internal) menjadi
# `ez-charge.apk` agar nama unduhan sesuai merek aplikasi.
APK_NAME="${SPKLU_APK_NAME:-ez-charge.apk}"
# Nama lama, dipertahankan sebagai symlink agar tautan lama tidak 404.
LEGACY_APK_NAME="spklu.apk"
PUBLIC_URL="https://energy.edifly-si.com/spklu/download_apk/$APK_NAME"
EXPECTED_CERT="${SPKLU_EXPECTED_CERT_SHA256:-f3f822a038647ff3f35da3b99b363ad22c7c507bd29917423f87eaf6e54ed71c}"
BACKUP_KEEP="${SPKLU_BACKUP_KEEP:-5}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_TOOL="$SCRIPT_DIR/apk-cert-sha256.py"

die() { echo "GAGAL: $*" >&2; exit 1; }

# ---------------------------------------------------------------- argumen
APK_FILE=""; VERSION_CODE=""; VERSION_NAME=""; CHANGELOG=""
MIN_VERSION_CODE=""; FORCE="false"; ALLOW_DOWNGRADE=0; SKIP_SIG=0
POSITIONAL=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --min-version-code) MIN_VERSION_CODE="${2:?--min-version-code butuh nilai}"; shift 2 ;;
    --force)            FORCE="true"; shift ;;
    --allow-downgrade)  ALLOW_DOWNGRADE=1; shift ;;
    --skip-signature-check) SKIP_SIG=1; shift ;;
    --help|-h)
      sed -n '2,31p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) die "opsi tidak dikenal: $1" ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done

APK_FILE="${POSITIONAL[0]:-}"; VERSION_CODE="${POSITIONAL[1]:-}"
VERSION_NAME="${POSITIONAL[2]:-}"; CHANGELOG="${POSITIONAL[3]:-}"
[[ -n "$APK_FILE" && -n "$VERSION_CODE" ]] || \
  die "Usage: publish-apk.sh <apk-file> <versionCode> [versionName] [changelog] [opsi]"

# ---------------------------------------------------------------- penjaga 1-2
[[ -f "$APK_FILE" ]] || die "APK tidak ditemukan: $APK_FILE"
[[ "$VERSION_CODE" =~ ^[0-9]+$ ]] || die "versionCode harus integer positif (diberikan: $VERSION_CODE)"
if [[ -n "$MIN_VERSION_CODE" && ! "$MIN_VERSION_CODE" =~ ^[0-9]+$ ]]; then
  die "--min-version-code harus integer (diberikan: $MIN_VERSION_CODE)"
fi
if [[ ! -f "$CERT_TOOL" && $SKIP_SIG -eq 0 ]]; then
  die "alat verifikasi tidak ditemukan: $CERT_TOOL (pakai --skip-signature-check untuk memaksa)"
fi

echo "Memeriksa berkas APK..."
file "$APK_FILE" | grep -qiE "zip|android" || \
  echo "  peringatan: 'file' tidak mengenali berkas ini sebagai ZIP/APK, melanjutkan pemeriksaan isi"

# Penjaga integritas: APK yang terpotong saat transfer tetap terlihat seperti
# ZIP dari `file`, tetapi gagal dipasang di perangkat dengan pesan
# "package appears to be invalid". Periksa direktori pusat ZIP-nya di sini,
# sebelum berkas dipublikasikan.
python3 - "$APK_FILE" <<'PY' || die "berkas APK tidak utuh (ZIP rusak/terpotong). Upload ulang, lalu bandingkan sha256 kedua sisi."
import sys, zipfile
path = sys.argv[1]
try:
    z = zipfile.ZipFile(path)
    names = z.namelist()
except Exception as exc:
    sys.exit(1)
if not names or "AndroidManifest.xml" not in names:
    sys.exit(1)
if z.testzip() is not None:
    sys.exit(1)
print(f"  integritas ZIP OK: {len(names)} entri, AndroidManifest.xml ada")
PY

# ---------------------------------------------------------------- penjaga 3
PREV_CODE=""; PREV_MIN=""
if [[ -f "$APK_DIR/version.json" ]]; then
  read -r PREV_CODE PREV_MIN < <(python3 - "$APK_DIR/version.json" <<'PY'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    print(int(d.get("versionCode") or 0), int(d.get("minVersionCode") or 0))
except Exception:
    print(0, 0)
PY
)
  if [[ "$VERSION_CODE" -le "$PREV_CODE" ]]; then
    if [[ $ALLOW_DOWNGRADE -eq 0 ]]; then
      die "versionCode $VERSION_CODE <= rilis terakhir ($PREV_CODE).
      Klien membandingkan versionCode sebagai integer — menurunkan atau menyamakan
      berarti tidak ada pengguna yang menerima update. Naikkan versionCode, atau
      pakai --allow-downgrade bila memang disengaja."
    fi
    echo "  peringatan: --allow-downgrade dipakai (versionCode $VERSION_CODE <= $PREV_CODE)"
  fi
fi

if [[ -z "$MIN_VERSION_CODE" ]]; then
  MIN_VERSION_CODE="${PREV_MIN:-0}"
  echo "  minVersionCode dipertahankan dari rilis sebelumnya: $MIN_VERSION_CODE"
else
  echo "  minVersionCode ditetapkan: $MIN_VERSION_CODE"
fi

# ---------------------------------------------------------------- penjaga 4
if [[ $SKIP_SIG -eq 1 ]]; then
  echo "  peringatan: verifikasi tanda tangan DILEWATI (--skip-signature-check)"
else
  echo "Memverifikasi sertifikat penandatangan..."
  GOT_CERT="$(python3 "$CERT_TOOL" "$APK_FILE")" || \
    die "tidak dapat membaca tanda tangan APK (gunakan --skip-signature-check bila APK memang belum ditandatangani skema v2/v3)"
  if [[ "$GOT_CERT" != "$EXPECTED_CERT" ]]; then
    die "sertifikat penandatangan TIDAK COCOK.
      diharapkan : $EXPECTED_CERT
      ditemukan  : $GOT_CERT
      APK yang ditandatangani kunci berbeda tidak dapat dipasang menimpa versi lama
      (INSTALL_FAILED_UPDATE_INCOMPATIBLE), sementara klien akan terus ditawari update
      yang selalu gagal. Bangun ulang dengan keystore rilis yang benar."
  fi
  echo "  sertifikat cocok: ${GOT_CERT:0:16}…"
fi

# ---------------------------------------------------------------- penjaga 5
mkdir -p "$APK_DIR"
if [[ -f "$APK_DIR/$APK_NAME" || -f "$APK_DIR/$LEGACY_APK_NAME" || -f "$APK_DIR/version.json" ]]; then
  TS="$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR/$TS"
  # -f mengikuti symlink; simpan salinan nyata, bukan symlink-nya.
  [[ -f "$APK_DIR/$APK_NAME" ]] && cp -L "$APK_DIR/$APK_NAME" "$BACKUP_DIR/$TS/" 2>/dev/null || true
  [[ -f "$APK_DIR/$LEGACY_APK_NAME" ]] && cp -L "$APK_DIR/$LEGACY_APK_NAME" "$BACKUP_DIR/$TS/$LEGACY_APK_NAME" 2>/dev/null || true
  [[ -f "$APK_DIR/version.json" ]] && cp "$APK_DIR/version.json" "$BACKUP_DIR/$TS/"
  echo "  rilis sebelumnya dicadangkan: $BACKUP_DIR/$TS"
fi

# ---------------------------------------------------------------- publikasi
cp "$APK_FILE" "$APK_DIR/$APK_NAME"
SIZE="$(stat -c%s "$APK_DIR/$APK_NAME")"
SHA256="$(sha256sum "$APK_DIR/$APK_NAME" | cut -d' ' -f1)"

# Verifikasi hasil salin: ukuran dan hash harus sama dengan sumber.
SRC_SHA="$(sha256sum "$APK_FILE" | cut -d' ' -f1)"
[[ "$SRC_SHA" == "$SHA256" ]] || die "salinan tidak identik dengan sumber (sha256 berbeda)"
echo "  salinan terverifikasi: $SIZE byte, sha256 ${SHA256:0:16}…"

# Tautan lama (spklu.apk) diarahkan ke berkas baru agar URL lama tetap hidup.
if [[ "$APK_NAME" != "$LEGACY_APK_NAME" ]]; then
  rm -f "$APK_DIR/$LEGACY_APK_NAME"
  ln -s "$APK_NAME" "$APK_DIR/$LEGACY_APK_NAME"
  echo "  symlink kompatibilitas: $LEGACY_APK_NAME -> $APK_NAME"
fi

python3 - "$APK_DIR/version.json" "$VERSION_CODE" "$VERSION_NAME" "$CHANGELOG" \
          "$SIZE" "$SHA256" "$PUBLIC_URL" "$MIN_VERSION_CODE" "$FORCE" <<'PY'
import json, sys
path, code, name, changelog, size, sha, url, minc, force = sys.argv[1:10]
data = {
    "versionName": name or f"1.0.{code}",
    "versionCode": int(code),
    "minVersionCode": int(minc),
    "url": url,
    "size": int(size),
    "sha256": sha,
    "changelog": changelog or "",
    "force": force == "true",
}
with open(path, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write("\n")
PY

# ---------------------------------------------------------------- pemangkasan cadangan
if [[ -d "$BACKUP_DIR" ]]; then
  mapfile -t OLD < <(ls -1dt "$BACKUP_DIR"/*/ 2>/dev/null | tail -n +$((BACKUP_KEEP + 1)) || true)
  for d in "${OLD[@]:-}"; do [[ -n "$d" ]] && rm -rf "$d"; done
fi

echo
echo "APK terpublikasi:"
echo "  Cek versi : https://energy.edifly-si.com/spklu/download_apk/version.json"
echo "  Download  : $PUBLIC_URL"
echo "  versionCode=$VERSION_CODE  versionName=${VERSION_NAME:-1.0.$VERSION_CODE}  minVersionCode=$MIN_VERSION_CODE  force=$FORCE"
echo "  size=$SIZE  sha256=$SHA256"
