const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('about:blank');
  const ua = await page.evaluate(() => navigator.userAgent);
  console.log('LAUNCH OK, UA:', ua.slice(0, 60));
  await browser.close();
})().catch((e) => { console.error('LAUNCH GAGAL:', e.message); process.exit(1); });
