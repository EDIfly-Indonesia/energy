#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ambil SHA-256 sertifikat penandatangan dari APK (APK Signature Scheme v2/v3).

Keluaran: satu baris hex sha256 dari DER sertifikat penandatangan pertama.
Keluar dengan kode 2 bila blok tanda tangan tidak ditemukan / tidak terbaca.

Dipakai oleh scripts/publish-apk.sh sebagai penjaga integritas rantai update:
APK yang ditandatangani kunci berbeda TIDAK BISA dipasang menimpa versi lama
(INSTALL_FAILED_UPDATE_INCOMPATIBLE), jadi lebih baik ditolak di sisi publish.

Tanpa dependensi eksternal (hanya stdlib) — VM tidak punya java/apksigner.
"""
import hashlib
import struct
import sys
import zipfile

SIG_BLOCK_MAGIC = b"APK Sig Block 42"
ID_V2 = 0x7109871A
ID_V3 = 0xF05368C0


def lp(buf, off):
    """Baca nilai length-prefixed (uint32 LE + data)."""
    if off + 4 > len(buf):
        raise ValueError("buffer terlalu pendek untuk length prefix")
    n = struct.unpack_from("<I", buf, off)[0]
    if off + 4 + n > len(buf):
        raise ValueError("panjang melebihi ukuran buffer")
    return buf[off + 4:off + 4 + n], off + 4 + n


def find_signing_block(fp):
    """Kembalikan isi APK Signing Block, atau None."""
    fp.seek(0, 2)
    file_size = fp.tell()
    tail = min(file_size, 65557)
    fp.seek(file_size - tail)
    data = fp.read(tail)
    eocd = data.rfind(b"PK\x05\x06")
    if eocd < 0:
        return None
    cd_offset = struct.unpack_from("<I", data, eocd + 16)[0]

    if cd_offset < 24:
        return None
    fp.seek(cd_offset - 24)
    footer = fp.read(24)
    size2 = struct.unpack_from("<Q", footer, 0)[0]
    if footer[8:24] != SIG_BLOCK_MAGIC:
        return None

    start = cd_offset - size2 - 8
    if start < 0:
        return None
    fp.seek(start)
    block = fp.read(size2 + 8)
    size1 = struct.unpack_from("<Q", block, 0)[0]
    if size1 != size2:
        return None
    return block[8:-24]


def cert_sha256_from_block(block):
    """Telusuri pasangan (id, value) di dalam APK Signing Block."""
    off = 0
    found_v3 = None
    while off + 12 <= len(block):
        length = struct.unpack_from("<Q", block, off)[0]
        if length < 4 or off + 8 + length > len(block):
            break
        pair_id = struct.unpack_from("<I", block, off + 8)[0]
        value = block[off + 12: off + 8 + length]
        if pair_id == ID_V2:
            return extract_v2(value)
        if pair_id == ID_V3 and found_v3 is None:
            found_v3 = value
        off += 8 + length
    if found_v3 is not None:
        return extract_v2(found_v3)   # struktur signer v3 sama untuk bagian sertifikat
    return None


def extract_v2(value):
    """value -> signers -> signer -> signed data -> certificates -> cert pertama."""
    signers, _ = lp(value, 0)
    signer, _ = lp(signers, 0)
    signed_data, _ = lp(signer, 0)
    _digests, o = lp(signed_data, 0)
    certs, _o = lp(signed_data, o)
    cert, _ = lp(certs, 0)
    return hashlib.sha256(cert).hexdigest()


def main():
    if len(sys.argv) != 2:
        print("usage: apk-cert-sha256.py <apk>", file=sys.stderr)
        return 1
    path = sys.argv[1]
    try:
        if not zipfile.is_zipfile(path):
            print("bukan berkas ZIP/APK", file=sys.stderr)
            return 2
        with zipfile.ZipFile(path) as z:
            if "AndroidManifest.xml" not in z.namelist():
                print("AndroidManifest.xml tidak ada — bukan APK", file=sys.stderr)
                return 2
        with open(path, "rb") as fp:
            block = find_signing_block(fp)
        if block is None:
            print("APK Signing Block tidak ditemukan (APK belum ditandatangani skema v2/v3)",
                  file=sys.stderr)
            return 2
        digest = cert_sha256_from_block(block)
        if not digest:
            print("sertifikat tidak ditemukan di blok tanda tangan", file=sys.stderr)
            return 2
    except Exception as exc:                                  # noqa: BLE001
        print(f"gagal membaca tanda tangan: {exc}", file=sys.stderr)
        return 2
    print(digest)
    return 0


if __name__ == "__main__":
    sys.exit(main())
