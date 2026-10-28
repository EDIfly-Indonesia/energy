'use strict';

/**
 * CAPTCHA login admin: generate SVG image + verify answer.
 * In-memory store (single-process, pm2 fork mode) — same pattern as otpStore.
 */

const crypto = require('crypto');

const store = new Map(); // id -> { code, expires }
const TTL = 5 * 60 * 1000; // 5 menit
// Tanpa karakter ambigu (0/O, 1/I) agar mudah dibaca.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length = 5) {
  let s = '';
  for (let i = 0; i < length; i++) s += CHARS[crypto.randomInt(CHARS.length)];
  return s;
}

function renderSvg(code) {
  const w = 150;
  const h = 50;
  const parts = [];
  parts.push(`<rect width="${w}" height="${h}" rx="6" fill="#f1f5f9"/>`);
  // garis noise
  for (let i = 0; i < 5; i++) {
    const x1 = crypto.randomInt(w);
    const y1 = crypto.randomInt(h);
    const x2 = crypto.randomInt(w);
    const y2 = crypto.randomInt(h);
    parts.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#cbd5e1" stroke-width="1.5"/>`
    );
  }
  // titik noise
  for (let i = 0; i < 40; i++) {
    const r = (crypto.randomInt(200) / 100) + 0.5;
    parts.push(
      `<circle cx="${crypto.randomInt(w)}" cy="${crypto.randomInt(h)}" r="${r}" fill="#94a3b8"/>`
    );
  }
  const step = w / (code.length + 1);
  for (let i = 0; i < code.length; i++) {
    const x = Math.round(step * (i + 0.5));
    const y = Math.round(h / 2 + crypto.randomInt(-8, 9));
    const rot = crypto.randomInt(-28, 29);
    const size = 28 + crypto.randomInt(-3, 4);
    const hue = crypto.randomInt(0, 360);
    parts.push(
      `<text x="${x}" y="${y}" fill="hsl(${hue}, 60%, 35%)" font-size="${size}" ` +
        `font-family="monospace" font-weight="bold" text-anchor="middle" dominant-baseline="middle" ` +
        `transform="rotate(${rot} ${x} ${y})">${code[i]}</text>`
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`;
}

function create() {
  // Bersihkan entri kedaluwarsa sesekali agar tidak bocor memori.
  if (store.size > 500) {
    const now = Date.now();
    for (const [k, v] of store) if (v.expires < now) store.delete(k);
  }
  const code = randomCode();
  const id = crypto.randomBytes(16).toString('hex');
  store.set(id, { code, expires: Date.now() + TTL });
  const svg = renderSvg(code);
  const image = 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64');
  return { id, image };
}

// Verifikasi + konsumsi (sekali pakai, case-insensitive).
function verify(id, answer) {
  if (!id || !answer) return false;
  const rec = store.get(String(id));
  if (!rec) return false;
  store.delete(String(id));
  if (Date.now() > rec.expires) return false;
  return String(answer).trim().toUpperCase() === rec.code;
}

module.exports = { create, verify };
