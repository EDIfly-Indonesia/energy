'use strict';

/**
 * Admin master-data CRUD: area, chargebox, connector.
 * Native Fastify handlers. Additive — does not touch mobile endpoints.
 * PostgreSQL-backed.
 */

const db = require('../services/database.service');
const { query } = db;

// jsonb columns (foto, fasilitas) need VALID JSON. A bare string such as an
// uploaded filename ("1699-abc.png") is not valid JSON on its own, so
// `$n::jsonb` rejects the whole INSERT. Always JSON-encode: a string becomes a
// quoted JSON string ("\"1699-abc.png\""), arrays/objects serialize normally.
function jsonField(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return JSON.stringify(v);
}

// ---------------------------------------------------------------- AREA

async function listArea(request, reply) {
  try {
    const rows = await query(
      'SELECT id_area, nama_area, alamat, kode_pos, kota, foto, pbjt FROM t_area ORDER BY nama_area ASC'
    );
    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.listArea]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

// PBJT-TL (UU HKPD: PPJ/PJU dilebur ke sini) — tarif daerah dalam persen.
function parsePbjt(v) {
  if (v === undefined || v === null || v === '') return { ok: true, value: 0 };
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: 'PBJT harus angka >= 0 (persen)' };
  }
  if (n > 100) {
    return { ok: false, message: 'PBJT maksimal 100 persen' };
  }
  return { ok: true, value: n };
}

async function createArea(request, reply) {
  const b = request.body || {};
  if (!b.nama_area) {
    return reply.send({ success: false, message: 'Nama area wajib diisi', data: null });
  }
  const pbjt = parsePbjt(b.pbjt);
  if (!pbjt.ok) return reply.send({ success: false, message: pbjt.message, data: null });
  try {
    const res = await query(
      'INSERT INTO t_area (nama_area, alamat, kode_pos, kota, foto, pbjt) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_area',
      [b.nama_area, b.alamat ?? null, b.kode_pos ?? null, b.kota ?? null, b.foto ?? null, pbjt.value]
    );
    return reply.send({ success: true, message: 'Berhasil disimpan', data: { id_area: res[0].id_area } });
  } catch (err) {
    console.error('[admin.createArea]', err);
    return reply.send({ success: false, message: 'Gagal menyimpan data', data: null });
  }
}

async function updateArea(request, reply) {
  const id = request.params.id;
  const b = request.body || {};
  if (!b.nama_area) {
    return reply.send({ success: false, message: 'Nama area wajib diisi', data: null });
  }
  const pbjt = parsePbjt(b.pbjt);
  if (!pbjt.ok) return reply.send({ success: false, message: pbjt.message, data: null });
  try {
    await query(
      'UPDATE t_area SET nama_area=$1, alamat=$2, kode_pos=$3, kota=$4, foto=$5, pbjt=$6 WHERE id_area=$7',
      [b.nama_area, b.alamat ?? null, b.kode_pos ?? null, b.kota ?? null, b.foto ?? null, pbjt.value, id]
    );
    return reply.send({ success: true, message: 'Berhasil diubah', data: null });
  } catch (err) {
    console.error('[admin.updateArea]', err);
    return reply.send({ success: false, message: 'Gagal mengubah data', data: null });
  }
}

async function deleteArea(request, reply) {
  const id = request.params.id;
  try {
    await query('DELETE FROM t_area WHERE id_area=$1', [id]);
    return reply.send({ success: true, message: 'Berhasil dihapus', data: null });
  } catch (err) {
    console.error('[admin.deleteArea]', err);
    return reply.send({ success: false, message: 'Gagal menghapus data', data: null });
  }
}

// ------------------------------------------------------------- CHARGEBOX

const OCPP_PROTOCOLS = ['non_ocpp', 'ocpp1.6J', 'ocpp2.0', 'ocpp2.0.1'];
const JENIS = ['car', 'bike'];

// Chargebox ID dibuat otomatis: "EZ" + 5 digit acak (mis. EZ48213).
// Di-retry sampai unik (kolom chargebox_id tidak punya unique constraint,
// jadi pengecekan dilakukan manual sebelum INSERT).
async function generateChargeboxId() {
  for (let i = 0; i < 25; i++) {
    const candidate = 'EZ' + String(Math.floor(Math.random() * 100000)).padStart(5, '0');
    const rows = await query('SELECT 1 FROM t_chargebox WHERE chargebox_id=$1 LIMIT 1', [candidate]);
    if (rows.length === 0) return candidate;
  }
  throw new Error('Tidak dapat membuat Chargebox ID unik');
}

function chargeboxFields(b) {
  return [
    b.chargebox_id,
    b.nama_chargebox,
    b.deskripsi ?? null,
    b.jenis ?? 'car',
    Number(b.id_mitra) || 0,
    b.lat ?? null,
    b.lng ?? null,
    Number(b.id_area) || 0,
    b.ocpp_protocol ?? 'ocpp1.6J',
    b.vendor ?? null,
    b.model ?? null,
    b.serial_number ?? null,
    Number(b.is_ppn) || 0,
    Number(b.is_pbjt) || 0,
    Number(b.pju) || 0,
    Number(b.is_public) || 1,
    Number(b.is_active) || 1,
    jsonField(b.fasilitas),
    jsonField(b.foto),
  ];
}

async function getChargebox(request, reply) {
  const id = request.params.id;
  try {
    const rows = await query('SELECT * FROM t_chargebox WHERE id_chargebox=$1', [id]);
    if (rows.length === 1) {
      return reply.send({ success: true, message: 'Berhasil', data: rows[0] });
    }
    return reply.send({ success: false, message: 'Data tidak ditemukan', data: null });
  } catch (err) {
    console.error('[admin.getChargebox]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

async function createChargebox(request, reply) {
  const b = request.body || {};
  if (!b.nama_chargebox) {
    return reply.send({ success: false, message: 'Nama chargebox wajib diisi', data: null });
  }
  if (!OCPP_PROTOCOLS.includes(b.ocpp_protocol)) {
    return reply.send({ success: false, message: 'OCPP Protocol tidak valid', data: null });
  }
  if (!JENIS.includes(b.jenis)) {
    return reply.send({ success: false, message: "Jenis harus 'car' atau 'bike'", data: null });
  }
  try {
    // Chargebox ID dibuat otomatis oleh server (CB + 5 digit), abaikan nilai dari client.
    b.chargebox_id = await generateChargeboxId();
    const res = await query(
      `INSERT INTO t_chargebox
       (chargebox_id, nama_chargebox, deskripsi, jenis, id_mitra, lat, lng, id_area,
        ocpp_protocol, vendor, model, serial_number, is_ppn, is_pbjt, pju, is_public, is_active, fasilitas, foto)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb)
       RETURNING id_chargebox`,
      chargeboxFields(b)
    );
    return reply.send({
      success: true,
      message: 'Berhasil disimpan',
      data: { id_chargebox: res[0].id_chargebox, chargebox_id: b.chargebox_id },
    });
  } catch (err) {
    console.error('[admin.createChargebox]', err);
    return reply.send({ success: false, message: 'Gagal menyimpan data', data: null });
  }
}

async function updateChargebox(request, reply) {
  const id = request.params.id;
  const b = request.body || {};
  if (!b.nama_chargebox) {
    return reply.send({ success: false, message: 'Nama chargebox wajib diisi', data: null });
  }
  if (!OCPP_PROTOCOLS.includes(b.ocpp_protocol)) {
    return reply.send({ success: false, message: 'OCPP Protocol tidak valid', data: null });
  }
  if (!JENIS.includes(b.jenis)) {
    return reply.send({ success: false, message: "Jenis harus 'car' atau 'bike'", data: null });
  }
  try {
    // Chargebox ID adalah identitas perangkat (OCPP/QR) — tidak boleh berubah saat edit.
    const cur = await query('SELECT chargebox_id FROM t_chargebox WHERE id_chargebox=$1', [id]);
    if (cur.length === 0) {
      return reply.send({ success: false, message: 'Data tidak ditemukan', data: null });
    }
    b.chargebox_id = cur[0].chargebox_id;
    await query(
      `UPDATE t_chargebox SET
         chargebox_id=$1, nama_chargebox=$2, deskripsi=$3, jenis=$4, id_mitra=$5, lat=$6, lng=$7, id_area=$8,
         ocpp_protocol=$9, vendor=$10, model=$11, serial_number=$12, is_ppn=$13, is_pbjt=$14, pju=$15, is_public=$16, is_active=$17, fasilitas=$18::jsonb, foto=$19::jsonb
       WHERE id_chargebox=$20`,
      [...chargeboxFields(b), id]
    );
    return reply.send({ success: true, message: 'Berhasil diubah', data: null });
  } catch (err) {
    console.error('[admin.updateChargebox]', err);
    return reply.send({ success: false, message: 'Gagal mengubah data', data: null });
  }
}

async function deleteChargebox(request, reply) {
  const id = request.params.id;
  try {
    const rows = await query('SELECT chargebox_id FROM t_chargebox WHERE id_chargebox=$1', [id]);
    if (rows.length === 0) {
      return reply.send({ success: false, message: 'Data tidak ditemukan', data: null });
    }
    const chargeboxId = rows[0].chargebox_id;
    // No FK from t_connector_detail/t_connector_status to t_chargebox, so clean
    // up explicitly — otherwise deleting a chargebox leaves orphan connector
    // rows behind.
    await query('DELETE FROM t_connector_detail WHERE chargebox_id=$1', [chargeboxId]);
    await query('DELETE FROM t_connector_status WHERE chargebox_id=$1', [chargeboxId]);
    await query('DELETE FROM t_chargebox WHERE id_chargebox=$1', [id]);
    return reply.send({ success: true, message: 'Berhasil dihapus', data: null });
  } catch (err) {
    console.error('[admin.deleteChargebox]', err);
    return reply.send({ success: false, message: 'Gagal menghapus data', data: null });
  }
}

// ------------------------------------------------------------ CONNECTOR

async function listConnector(request, reply) {
  const chargeboxId = request.params.chargeboxId;
  try {
    const rows = await query(
      'SELECT * FROM t_connector_detail WHERE chargebox_id=$1 ORDER BY connector_id ASC',
      [chargeboxId]
    );
    return reply.send({ success: true, message: 'Berhasil', data: rows });
  } catch (err) {
    console.error('[admin.listConnector]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

// Tipe konektor yang diizinkan. KONTRAK (dikonfirmasi tim developer):
// connector_type HANYA "AC" atau "DC" — bukan nama fisik konektor.
// Harus sama persis dengan daftar di dashboard (src/connectorTypes.ts).
const CONNECTOR_TYPES = ['AC', 'DC'];

// Kelas layanan menentukan biaya per sesi (t_biaya 'layanan_<kelas>').
// Harus sama persis dengan CHECK constraint t_connector_detail_kelas_ck.
const KELAS_LAYANAN = ['normal', 'fast', 'ultra_fast'];

function badKelasLayanan(v) {
  return v !== undefined && v !== null && v !== '' && !KELAS_LAYANAN.includes(v);
}

function badConnectorType(v) {
  return v !== undefined && v !== null && v !== '' && !CONNECTOR_TYPES.includes(v);
}

// Angka konektor harus bilangan bulat. Tanpa ini, nilai seperti "22000,5"
// (koma = desimal gaya Indonesia) menjadi NaN lalu diam-diam tersimpan 0 oleh
// `Number(x) || 0`. Koma dan titik (pemisah ribuan) sama-sama ditolak.
function parseIntegerField(v, label, { min = 0, max = null } = {}) {
  if (v === undefined || v === null || v === '') return { ok: true, value: null };
  const s = String(v).trim();
  if (!/^\d+$/.test(s)) {
    return { ok: false, message: `${label} harus bilangan bulat tanpa koma atau titik` };
  }
  const n = Number(s);
  if (!Number.isSafeInteger(n)) return { ok: false, message: `${label} tidak valid` };
  if (n < min) return { ok: false, message: `${label} minimal ${min}` };
  if (max != null && n > max) return { ok: false, message: `${label} maksimal ${max}` };
  return { ok: true, value: n };
}

// Validasi ketiga kolom angka konektor sekaligus.
// electric_power dalam kW (kontrak: 7 / 30 / 60), bukan Watt.
function validateConnectorNumbers(b) {
  const power = parseIntegerField(b.electric_power, 'Daya', { max: 1000 });
  if (!power.ok) return power;
  const perKwh = parseIntegerField(b.harga_perkwh, 'Harga/kWh');
  if (!perKwh.ok) return perKwh;
  const perJam = parseIntegerField(b.harga_perjam, 'Harga/Jam');
  if (!perJam.ok) return perJam;
  return { ok: true, value: { electric_power: power.value, harga_perkwh: perKwh.value, harga_perjam: perJam.value } };
}

// Connector IDs are per-chargebox and OCPP-meaningful (1..N). `connector_id=0`
// denotes the charge point itself in OCPP, so it is never created here.
async function createConnector(request, reply) {
  const chargeboxId = request.params.chargeboxId;
  const b = request.body || {};
  if (badConnectorType(b.connector_type)) {
    return reply.send({
      success: false,
      message: `Tipe konektor tidak valid. Pilihan: ${CONNECTOR_TYPES.join(', ')}`,
      data: null,
    });
  }
  const nums = validateConnectorNumbers(b);
  if (!nums.ok) {
    return reply.send({ success: false, message: nums.message, data: null });
  }
  if (badKelasLayanan(b.kelas_layanan)) {
    return reply.send({
      success: false,
      message: `Kelas layanan tidak valid. Pilihan: ${KELAS_LAYANAN.join(', ')}`,
      data: null,
    });
  }
  try {
    const cb = await query('SELECT chargebox_id FROM t_chargebox WHERE chargebox_id=$1', [chargeboxId]);
    if (cb.length === 0) {
      return reply.send({ success: false, message: 'Chargebox tidak ditemukan', data: null });
    }

    let connectorId = b.connector_id == null || b.connector_id === '' ? null : Number(b.connector_id);
    if (connectorId != null) {
      if (!Number.isInteger(connectorId) || connectorId < 1) {
        return reply.send({ success: false, message: 'Nomor konektor harus bilangan bulat >= 1', data: null });
      }
      const dup = await query(
        'SELECT 1 FROM t_connector_detail WHERE chargebox_id=$1 AND connector_id=$2',
        [chargeboxId, connectorId]
      );
      if (dup.length) {
        return reply.send({ success: false, message: `Konektor #${connectorId} sudah ada`, data: null });
      }
    } else {
      // Auto-number: next free slot after the highest existing connector.
      const nxt = await query(
        'SELECT COALESCE(MAX(connector_id), 0) + 1 AS next FROM t_connector_detail WHERE chargebox_id=$1',
        [chargeboxId]
      );
      connectorId = Number(nxt[0].next) || 1;
    }

    const rows = await query(
      `INSERT INTO t_connector_detail
         (chargebox_id, connector_id, electric_power, connector_type,
          harga_perkwh, harga_perjam, status, updated_by, last_update, kelas_layanan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now(),$9)
       RETURNING *`,
      [
        chargeboxId,
        connectorId,
        nums.value.electric_power,
        b.connector_type ?? null,
        nums.value.harga_perkwh ?? 0,
        nums.value.harga_perjam ?? 0,
        b.status ?? null,
        (request.admin && request.admin.code) || null,
        b.kelas_layanan || null,
      ]
    );
    return reply.send({ success: true, message: 'Berhasil disimpan', data: rows[0] });
  } catch (err) {
    console.error('[admin.createConnector]', err);
    if (err && err.code === '23505') {
      return reply.send({ success: false, message: 'Nomor konektor sudah dipakai', data: null });
    }
    return reply.send({ success: false, message: 'Gagal menyimpan data', data: null });
  }
}

async function updateConnector(request, reply) {
  const id = request.params.id;
  const b = request.body || {};
  try {
    const cur = await query('SELECT id, connector_type FROM t_connector_detail WHERE id=$1', [id]);
    if (cur.length === 0) {
      return reply.send({ success: false, message: 'Konektor tidak ditemukan', data: null });
    }
    // Nilai lama di luar daftar tetap boleh dipertahankan (mis. data legacy),
    // tapi nilai BARU harus salah satu dari daftar.
    const sameAsStored = b.connector_type === cur[0].connector_type;
    if (!sameAsStored && badConnectorType(b.connector_type)) {
      return reply.send({
        success: false,
        message: `Tipe konektor tidak valid. Pilihan: ${CONNECTOR_TYPES.join(', ')}`,
        data: null,
      });
    }
    const nums = validateConnectorNumbers(b);
    if (!nums.ok) {
      return reply.send({ success: false, message: nums.message, data: null });
    }
    if (badKelasLayanan(b.kelas_layanan)) {
      return reply.send({
        success: false,
        message: `Kelas layanan tidak valid. Pilihan: ${KELAS_LAYANAN.join(', ')}`,
        data: null,
      });
    }
    await query(
      `UPDATE t_connector_detail
          SET electric_power=$1, connector_type=$2, harga_perkwh=$3, harga_perjam=$4,
              status=COALESCE($5, status), updated_by=$6, last_update=now(),
              kelas_layanan=$7
        WHERE id=$8`,
      [
        nums.value.electric_power,
        b.connector_type ?? null,
        nums.value.harga_perkwh ?? 0,
        nums.value.harga_perjam ?? 0,
        b.status ?? null,
        (request.admin && request.admin.code) || null,
        b.kelas_layanan || null,
        id,
      ]
    );
    return reply.send({ success: true, message: 'Berhasil diubah', data: null });
  } catch (err) {
    console.error('[admin.updateConnector]', err);
    return reply.send({ success: false, message: 'Gagal mengubah data', data: null });
  }
}

async function deleteConnector(request, reply) {
  const id = request.params.id;
  try {
    const rows = await query(
      'SELECT id, chargebox_id, connector_id FROM t_connector_detail WHERE id=$1',
      [id]
    );
    if (rows.length === 0) {
      return reply.send({ success: false, message: 'Konektor tidak ditemukan', data: null });
    }
    const { chargebox_id: chargeboxId } = rows[0];

    // The mobile list (/chargebox/nearest) INNER JOINs t_connector_detail, so a
    // chargebox with zero connectors silently disappears from the app. Keep at
    // least one connector per chargebox.
    const cnt = await query(
      'SELECT COUNT(*)::int AS n FROM t_connector_detail WHERE chargebox_id=$1',
      [chargeboxId]
    );
    if (cnt[0].n <= 1) {
      return reply.send({
        success: false,
        message: 'Konektor terakhir tidak dapat dihapus — chargebox akan hilang dari aplikasi mobile',
        data: null,
      });
    }

    await query('DELETE FROM t_connector_detail WHERE id=$1', [id]);
    return reply.send({ success: true, message: 'Berhasil dihapus', data: null });
  } catch (err) {
    console.error('[admin.deleteConnector]', err);
    return reply.send({ success: false, message: 'Gagal menghapus data', data: null });
  }
}

module.exports = {
  listArea,
  createArea,
  updateArea,
  deleteArea,
  getChargebox,
  createChargebox,
  updateChargebox,
  deleteChargebox,
  listConnector,
  createConnector,
  updateConnector,
  deleteConnector,
};
