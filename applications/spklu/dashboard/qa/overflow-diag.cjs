// Diagnosa: elemen mana yang menyebabkan overflow horizontal di 600px.
// Jalankan di VM: node qa/overflow-diag.cjs
const { chromium } = require('playwright');

const BASE = 'https://energy.edifly-si.com/spklu';
const API = 'http://127.0.0.1:8080';

function decodeCode(b64) {
  const svg = Buffer.from(b64, 'base64').toString('utf8');
  return [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1]).join('');
}

(async () => {
  const c = await fetch(`${API}/admin/captcha`).then((r) => r.json());
  const l = await fetch(`${API}/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin', password: 'Pltsapp2026**',
      captcha_id: c.data.id, captcha: decodeCode(c.data.image.split(',')[1]),
    }),
  }).then((r) => r.json());

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 600, height: 900 } });
  await ctx.addInitScript((t) => {
    localStorage.setItem('spklu_token', t);
    localStorage.setItem('spklu_type', '1');
    localStorage.setItem('spklu_name', 'Admin');
  }, l.token);
  const page = await ctx.newPage();

  for (const route of ['/promo', '/promo-mitra', '/promo-iklan', '/promo-peserta', '/promo-eksposur', '/berita']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1').catch(() => {});
    await page.waitForTimeout(1200);

    const info = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const scrollW = document.documentElement.scrollWidth;
      const offenders = [];
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > docW + 2) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className || '').toString().slice(0, 60),
            w: Math.round(r.width),
            right: Math.round(r.right),
          });
        }
      });
      // ambil 6 teratas (yang paling kanan)
      offenders.sort((a, b) => b.right - a.right);
      return { docW, scrollW, offenders: offenders.slice(0, 6) };
    });

    const over = info.scrollW > info.docW + 2;
    console.log(`${over ? 'OVERFLOW' : 'ok      '}  ${route.padEnd(16)} doc=${info.docW} scroll=${info.scrollW}`);
    for (const o of info.offenders) {
      console.log(`            ${o.tag}.${o.cls} w=${o.w} right=${o.right}`);
    }
  }

  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
