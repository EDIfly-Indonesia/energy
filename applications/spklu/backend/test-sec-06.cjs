'use strict';
// Temp test: SEC-06 — SVG upload rejected; PNG accepted; uploads served with CSP sandbox.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { data: { id: 59, code: 'admin', name: 'Admin', type_id: 1, id_mitra: null }, admin: true, scope: 'admin' },
  process.env.SECRET_KEY,
  { expiresIn: 3600 }
);

async function upload(name, content, type) {
  const fd = new FormData();
  fd.append('file', new Blob([content], { type }), name);
  const res = await fetch('http://127.0.0.1:8080/admin/upload?folder=chargebox', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: fd,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

(async () => {
  let pass = 0, fail = 0;

  // 1) SVG upload must be rejected
  const svg = await upload('x.svg', '<svg onload="alert(document.domain)"></svg>', 'image/svg+xml');
  const svgOk = svg.body && svg.body.success === false && /Format file/.test(svg.body.message);
  svgOk ? pass++ : fail++;
  console.log(`${svgOk ? 'PASS' : 'FAIL'}  upload .svg -> ${JSON.stringify(svg.body)}`);

  // 2) PNG upload must be accepted
  const png = await upload('x.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]), 'image/png');
  const pngOk = png.body && png.body.success === true;
  pngOk ? pass++ : fail++;
  console.log(`${pngOk ? 'PASS' : 'FAIL'}  upload .png -> success=${png.body && png.body.success}`);

  // 3) served upload must carry CSP sandbox + nosniff
  let cspOk = false, nosniffOk = false;
  if (pngOk && png.body && png.body.data && png.body.data.url) {
    // url = /spklu/dashboard/uploads/chargebox/<name>; backend serves at /uploads/chargebox/<name>
    const filename = png.body.data.filename;
    const r = await fetch(`http://127.0.0.1:8080/uploads/chargebox/${filename}`);
    cspOk = r.headers.get('content-security-policy') === 'sandbox';
    nosniffOk = r.headers.get('x-content-type-options') === 'nosniff';
  }
  (cspOk && nosniffOk) ? pass++ : fail++;
  console.log(`${cspOk && nosniffOk ? 'PASS' : 'FAIL'}  served file headers -> csp-sandbox=${cspOk} nosniff=${nosniffOk}`);

  console.log(`\n==== RESULT: ${pass} pass, ${fail} fail ====`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('TEST ERROR', e); process.exit(1); });
