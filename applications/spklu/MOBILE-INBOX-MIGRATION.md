# Migrasi Inbox: Supabase → REST API (VM saja)

Status backend: **selesai dan teruji** (21 asersi, `inbox-api-test.cjs`).
Status app mobile: **belum** — source Flutter tidak ada di VM ini, jadi bagian
Dart di bawah harus diterapkan oleh developer mobile.

Tujuan: tidak ada lagi ketergantungan Supabase. Semua data dibaca dari
PostgreSQL `energy-postgres` (database `spklu`) lewat backend Fastify.

---

## 1. Endpoint pengganti

Semua `POST`, `Content-Type: application/json`, dan **wajib**
`Authorization: Bearer <token>` dari `POST /auth/login`.

### 1.1 `POST /informasi/getberita_user`

Body:

```json
{ "limit": 25 }
```

`limit` opsional, **integer** 1..100, default 25. String `"25"` ditolak 400.

Respons:

```json
{
  "success": true,
  "message": "Berita ditemukan",
  "data": [
    {
      "id": 12,
      "created_at": "2026-10-20T09:14:03.512Z",
      "id_user": 8,
      "no_trans": "",
      "judul": "Charging Selesai",
      "isi": "Charging transaksi TRX... selesai",
      "jenis_berita": "finishcharging",
      "dibaca": false
    }
  ]
}
```

- Hanya baris milik user token. `id_user` di body **diabaikan** (diambil dari
  token), jadi tidak bisa membaca inbox orang lain.
- Urut `id DESC` (terbaru dulu).
- `dibaca` selalu boolean (bukan null/string).
- Kosong: `success: true, message: "Data tidak ada", data: []`.

### 1.2 `POST /informasi/setberitadibaca`

Body: `{ "id": 12 }` → `{ "success": true, "message": "Berita ditandai dibaca", "data": { "id": 12 } }`

Hanya untuk berita milik user token. ID milik user lain → `success: false`.

### 1.3 `POST /informasi/getkonektor`

Body: `{ "chargebox_id": "EZ81920" }` → status terakhir per `connector_id`
(pengganti realtime stream `konektor`).

### 1.4 `POST /informasi/getcharging`

Body: `{ "no_trans": "TRX..." }` → riwayat progres charging untuk transaksi itu
(pengganti realtime stream `charging`). Diverifikasi kepemilikan lewat
`t_transaction.id_user`, jadi transaksi user lain mengembalikan `data: []`.

---

## 2. Perubahan di `InboxViewModel`

Hapus `supabase_flutter` dari jalur ini. Bentuk `getinbox()` yang dipakai
sekarang kira-kira begini:

```dart
// SEBELUM — membaca Supabase langsung
Future<void> getinbox() async {
  isLoading = true;
  notifyListeners();
  final response = await Supabase.instance.client
      .from('berita')
      .select()
      .eq('id_user', userId)
      .order('id', ascending: false)
      .limit(25);
  items = response.map((e) => BeritaModel.fromJson(e)).toList();
  isLoading = false;
  notifyListeners();
}
```

Ganti menjadi panggilan API. Sesuaikan nama helper dengan yang sudah ada di
project (mis. `ApiClient.post` / `http.post`), yang penting: kirim Bearer token
dan baca `data`.

```dart
// SESUDAH — lewat backend, tanpa Supabase
Future<void> getinbox() async {
  isLoading = true;
  notifyListeners();
  try {
    final res = await api.post(
      '/informasi/getberita_user',
      body: {'limit': 25},
      token: authToken,           // Bearer token dari /auth/login
    );
    if (res['success'] == true && res['data'] is List) {
      items = (res['data'] as List)
          .map((e) => BeritaModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      error = null;
    } else {
      items = [];
      error = res['message'];
    }
  } catch (e) {
    error = 'Gagal memuat inbox';
  } finally {
    isLoading = false;
    notifyListeners();
  }
}

Future<void> markAsRead(int id) async {
  await api.post(
    '/informasi/setberitadibaca',
    body: {'id': id},
    token: authToken,
  );
  final i = items.indexWhere((e) => e.id == id);
  if (i >= 0) {
    items[i] = items[i].copyWith(dibaca: true);
    notifyListeners();
  }
}
```

Catatan `BeritaModel.fromJson`: field dari API sama dengan kolom tabel
(`id`, `created_at`, `id_user`, `no_trans`, `judul`, `isi`, `jenis_berita`,
`dibaca`), jadi parser yang sudah ada tidak perlu diubah — kecuali jika dulu ia
membaca kolom tambahan yang memang tidak pernah ada di tabel.

---

## 3. Pengganti realtime: polling pendek

Supabase realtime diganti polling. Jangan `Timer.periodic` tanpa henti; ikat ke
lifecycle layar supaya tidak menembak saat app di background.

```dart
Timer? _pollTimer;

@override
void initState() {
  super.initState();
  _vm.getinbox();
  _pollTimer = Timer.periodic(const Duration(seconds: 15), (_) {
    if (mounted) _vm.getinbox();
  });
}

@override
void dispose() {
  _pollTimer?.cancel();
  super.dispose();
}
```

Interval yang disarankan:

| Data | Interval | Alasan |
|---|---|---|
| Inbox `berita` | 15–30 s | Notifikasi tidak butuh realtime; 15 s sudah terasa langsung |
| Status konektor | 5–10 s | Berubah saat user menekan tombol di layar itu juga |
| Progres charging | 5–10 s | Butuh terasa hidup, tapi bukan stream |
| Saat app di background | hentikan | `AppLifecycleState.paused` → `cancel()`, `resumed` → mulai lagi + fetch sekali |

Alternatif tanpa polling untuk layar yang sedang dibuka: WebSocket/SSE. Belum
dibuat, dan untuk kebutuhan sekarang polling cukup. Kalau nanti pindah ke
WebSocket, kontrak REST di atas tetap dipakai untuk fetch awal.

Beban query aman: `berita` sudah punya index `berita_id_user_id_desc
(id_user, id DESC)`, jadi feed per user memakai index scan, bukan seq scan.

---

## 4. Membersihkan sisa Supabase di app

- Hapus dependency `supabase_flutter` dari `pubspec.yaml` bila tidak ada
  pemakaian lain.
- Hapus inisialisasi `Supabase.initialize(url: ..., anonKey: ...)` dan
  konstanta URL/anon key Supabase dari kode.
- Cari sisa pemakaian: `grep -rn "Supabase\|supabase" lib/`.
- `anonKey` Supabase yang pernah ikut di APK harus dianggap bocor; kalau
  project Supabase lama masih hidup, matikan. Kalau sudah mati, tidak ada
  tindakan lain.

---

## 5. Verifikasi dari sisi backend (sudah dilakukan)

```
PASS  getberita_user tanpa limit -> 200
PASS  hanya berita milik user A
PASS  berita user B tidak bocor
PASS  urut terbaru dulu (id DESC)
PASS  field lengkap: id/created_at/judul/isi/jenis_berita/dibaca/no_trans
PASS  dibaca bertipe boolean, bukan string
PASS  limit 1 -> tepat 1 baris
PASS  limit string "1" ditolak 400
PASS  setberitadibaca milik sendiri -> sukses
PASS  dibaca benar-benar true di DB
PASS  tidak bisa menandai berita user lain
PASS  berita user B tetap belum dibaca
PASS  id 0 ditolak
PASS  getkonektor -> 200
PASS  getkonektor tanpa chargebox_id -> ditolak
PASS  getcharging tanpa no_trans -> ditolak
PASS  4 endpoint tanpa token -> invalid0
PASS  tidak ada sisa data uji
```

Belum teruji: `getcharging` dengan data nyata (`t_transaction` masih kosong di
DB), dan seluruh alur dari app mobile.
