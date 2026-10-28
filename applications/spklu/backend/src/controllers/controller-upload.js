'use strict';

/**
 * Admin foto upload (multipart) — saves to backend/uploads/<folder>/.
 * Folder whitelist mirrors the mobile app's URL structure:
 *   /uploads/chargebox/  /uploads/area/  /uploads/berita/foto/
 *   /uploads/berita/video/  /uploads/fasilitas/
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp']; // .svg dihapus (stored XSS, SEC-06)
// 'promo' = foto iklan promo mitra (API-PROMO.md §6.2). Tanpa entri ini,
// upload foto promo akan diam-diam jatuh ke folder 'chargebox'.
const FOLDERS = ['chargebox', 'area', 'berita/foto', 'berita/video', 'fasilitas', 'promo'];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

module.exports = {
  async upload(request, reply) {
    try {
      const data = await request.file();
      if (!data) {
        return reply.send({ success: false, message: 'File tidak ditemukan', data: null });
      }

      const ext = path.extname(data.filename).toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        return reply.send({ success: false, message: 'Format file tidak didukung', data: null });
      }

      const folder = (request.query && request.query.folder) || 'chargebox';
      const safeFolder = FOLDERS.includes(folder) ? folder : 'chargebox';

      const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      const dir = path.join(UPLOAD_DIR, safeFolder);
      fs.mkdirSync(dir, { recursive: true });
      const dest = path.join(dir, name);

      await new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(dest);
        data.file.pipe(ws);
        data.file.on('end', resolve);
        data.file.on('error', reject);
        ws.on('error', reject);
      });

      return reply.send({
        success: true,
        message: 'Upload berhasil',
        data: { url: `/spklu/dashboard/uploads/${safeFolder}/${name}`, filename: name },
      });
    } catch (err) {
      console.error('[admin.upload]', err);
      if (err && err.code === 'FST_REQ_FILE_TOO_LARGE') {
        return reply.send({ success: false, message: 'Ukuran file melebihi batas', data: null });
      }
      return reply.send({ success: false, message: 'Upload gagal', data: null });
    }
  },
};

module.exports.UPLOAD_DIR = UPLOAD_DIR;
module.exports.ALLOWED_EXT = ALLOWED_EXT;
module.exports.FOLDERS = FOLDERS;
