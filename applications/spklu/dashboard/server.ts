const port = Number(process.env.PORT ?? 5173);
const distDir = new URL('./dist', import.meta.url).pathname;

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';

    const file = Bun.file(distDir + path);
    if (await file.exists()) {
      return new Response(file);
    }

    // SPA fallback (react-router)
    return new Response(Bun.file(distDir + '/index.html'));
  },
});

console.log(`SPKLU Dashboard listening on http://localhost:${port}`);
