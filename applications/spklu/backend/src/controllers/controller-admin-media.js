'use strict';

/**
 * Admin media library — daftar + hapus file gambar yang sudah tersimpan di
 * `backend/uploads/<folder>/` (asset bersama untuk chargebox, berita, dsb.).
 *
 * Admin tidak perlu meng-upload ulang gambar setiap kali membuat artikel /
 * chargebox — mereka bisa memilih file yang sudah ada lewat daftar ini.
 *
 * Folder mengikuti struktur URL mobile (lihat controller-upload.js):
 *   chargebox, area, berita/foto, berita/video, fasilitas.
 * `foto` di DB tetap menyimpan NAMA FILE saja (bukan URL penuh), supaya kontrak
 * mobile (yang menyusun URL dari folder per-field) tidak berubah.
 */

const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR, FOLDERS, ALLOWED_EXT } = require('./controller-upload');

// URL publik yang dipakai dashboard (nginx -> backend @fastify/static /uploads/).
const PUBLIC_BASE = '/spklu/dashboard/uploads';

function imageFilesIn(folderRel) {
  const dir = path.join(UPLOAD_DIR, folderRel);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  let names = [];
  try {
    names = fs.readdirSync(dir);
  } catch (err) {
    console.error('[admin.imageFilesIn] readdir', err);
    return out;
  }
  for (const name of names) {
    if (!ALLOWED_EXT.includes(path.extname(name).toLowerCase())) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(full);
    } catch (err) {
      continue;
    }
    if (!st.isFile()) continue;
    out.push({
      folder: folderRel,
      filename: name,
      url: `${PUBLIC_BASE}/${folderRel}/${name}`,
      size: st.size,
      mtime: st.mtimeMs,
    });
  }
  return out;
}

async function listMedia(request, reply) {
  try {
    const q = request.query || {};
    // ?folder= memfilter ke satu folder; tanpa itu tampilkan semua folder.
    const folders = q.folder && FOLDERS.includes(q.folder) ? [q.folder] : FOLDERS;
    let items = [];
    for (const f of folders) items = items.concat(imageFilesIn(f));
    // Terbaru dulu — gambar yang baru di-upload muncul paling atas.
    items.sort((a, b) => b.mtime - a.mtime);
    return reply.send({ success: true, message: 'Berhasil', data: items });
  } catch (err) {
    console.error('[admin.listMedia]', err);
    return reply.send({ success: false, message: 'Terjadi kesalahan', data: null });
  }
}

async function deleteMedia(request, reply) {
  const b = request.body || {};
  const folder = String(b.folder || '');
  const filename = String(b.filename || '');

  if (!FOLDERS.includes(folder)) {
    return reply.send({ success: false, message: 'Folder tidak valid', data: null });
  }
  // Nama file harus basename murni (tanpa '/' atau '..') — cegah path traversal.
  const name = path.basename(filename);
  if (!name || name !== filename) {
    return reply.send({ success: false, message: 'Nama file tidak valid', data: null });
  }
  if (!ALLOWED_EXT.includes(path.extname(name).toLowerCase())) {
    return reply.send({ success: false, message: 'Format file tidak didukung', data: null });
  }

  const target = path.join(UPLOAD_DIR, folder, name);
  try {
    if (!fs.existsSync(target)) {
      return reply.send({ success: false, message: 'File tidak ditemukan', data: null });
    }
    fs.unlinkSync(target);
    return reply.send({ success: true, message: 'File dihapus', data: null });
  } catch (err) {
    console.error('[admin.deleteMedia]', err);
    return reply.send({ success: false, message: 'Gagal menghapus file', data: null });
  }
}

module.exports = { listMedia, deleteMedia };