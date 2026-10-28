# To-Do — Konsistensi UI SPKLU Admin (ikon, tombol Batal merah, datatable)

Status: [ ] belum / [x] selesai

## Fondasi
- [x] F1. Tambah dependensi icon `lucide-react`.
- [x] F2. CSS: base button inline-flex (icon kiri), class `.cancel` merah untuk Batal, style datatable.
- [x] F3. Komponen reusable `DataTable` (search + sort + pagination client-side).

## Per halaman (ikon tombol + Batal merah + datatable)
- [x] H1. Chargebox — ikon (Tambah/Ubah/Konektor/Hapus/Simpan/Batal), Batal merah, tabel → DataTable.
- [x] H2. Area — ikon (Tambah/Ubah/Hapus/Simpan/Batal), Batal merah, tabel → DataTable.
- [x] H3. Mitra — sama seperti Area.
- [x] H4. Pengguna — ikon, Batal merah, tabel → DataTable.
- [x] H5. Transaksi — tabel → DataTable (tanpa tombol action).
- [x] H6. Wallet — ikon (Selesai), DataTable untuk refund & topup.
- [x] H7. Laporan — ikon (Muat), DataTable untuk 4 tabel (transaksi/topup/refund/mitra).

## Verifikasi
- [x] `bun run build` (tsc + vite) lulus.

## Catatan
- Pagination client-side bekerja atas data yang sudah di-load API.
- Transaksi (`LIMIT 100`) & Wallet (`LIMIT 200`) dibatasi backend — server-side pagination
  adalah tahap lanjutan bila data melampaui batas tersebut.

## Opsional (di luar permintaan saat ini)
- [x] Mitra/Area/Pengguna: pindahkan form inline ke Modal seperti Chargebox.
