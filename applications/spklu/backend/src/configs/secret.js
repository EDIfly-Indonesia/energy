'use strict';

/**
 * Enkripsi reversible untuk secret yang disimpan di t_setting (mis. smtp_pass).
 *
 * bcrypt sengaja TIDAK dipakai di sini: bcrypt adalah hash satu arah untuk
 * VERIFIKASI password, sedangkan password SMTP harus bisa DIKEMBALIKAN ke teks
 * asli untuk diberikan ke nodemailer. Maka dipakai AES-256-GCM (enkripsi simetris
 * terautentikasi), kuncinya diturunkan dari SECRET_KEY (tanpa key .env baru).
 */

const crypto = require('crypto');

function encKey() {
  // Turunkan kunci 32-byte (AES-256) dari SECRET_KEY.
  return crypto.createHash('sha256').update(process.env.SECRET_KEY || '').digest();
}

function encryptSecret(plain) {
  if (plain === undefined || plain === null || plain === '') return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return 'enc:v1:' + iv.toString('base64') + ':' + tag.toString('base64') + ':' + enc.toString('base64');
}

function decryptSecret(stored) {
  if (!stored) return stored;
  if (!stored.startsWith('enc:v1:')) return stored; // nilai lama (plaintext) — tetap jalan
  const p = stored.split(':');
  try {
    const iv = Buffer.from(p[2], 'base64');
    const tag = Buffer.from(p[3], 'base64');
    const data = Buffer.from(p[4], 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch (e) {
    console.error('[secret] decrypt gagal:', e.message);
    return null;
  }
}

module.exports = { encryptSecret, decryptSecret };
