'use strict';

/**
 * SPKLU backend — Fastify entrypoint.
 * Replaces the legacy Express `app.js`. OCPP and non-OCPP servers live in
 * their own modules (src/ocpp/server.js, src/nonocpp/server.js).
 */

process.env.TZ = 'Asia/Jakarta';
require('dotenv').config({ path: './.env' });

// SEC-11: fail fast — no dev fallback for signing secrets in production.
if (!process.env.SECRET_KEY || !process.env.PENGACAK) {
  console.error('[FATAL] SECRET_KEY dan/atau PENGACAK tidak diatur di .env');
  process.exit(1);
}

const Fastify = require('fastify');
const path = require('path');

// DB pools + global settings side-effects (must mirror legacy app.js startup)
const db = require('./src/services/database.service');
require('./src/configs/global.js');

const chargingState = require('./src/services/chargingState');
const { createOcppServer } = require('./src/ocpp/server');
const { startNonOcppServer } = require('./src/nonocpp/server');
const { startScheduler } = require('./src/jobs/scheduler');

// --- recover active charging sessions from database on startup ---
chargingState.loadFromDatabase().catch((err) => {
  console.error('[Startup] Failed to load charging state from database:', err);
});

// --- OCPP WebSocket server (attached to Fastify's HTTP server below) ---
const rpcServer = createOcppServer();

// --- Fastify app ---
const fastify = Fastify({
  logger: false,
  bodyLimit: 104857600, // 100 MB (matches legacy body-parser limit)
  trustProxy: true, // behind nginx — pakai X-Forwarded-For untuk IP klien (rate limit, SEC-08)
});

// --- plugins ---
fastify.register(require('@fastify/formbody'));

fastify.register(require('@fastify/multipart'), {
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'uploads'),
  prefix: '/uploads/',
  // SEC-06: sandbox uploaded files so active content (SVG dsb.) can't run scripts
  // even if navigated to directly; keeps inline <img> display working (unlike
  // Content-Disposition: attachment).
  setHeaders: (reply) => {
    reply.header('Content-Security-Policy', 'sandbox');
    reply.header('X-Content-Type-Options', 'nosniff');
  },
});

fastify.register(require('@fastify/helmet'), {
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // swagger-ui injects inline init script
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
});

// CORS: allowlist eksplisit (SEC-07) — jangan refleksikan origin sembarang.
// Dashboard & mobile mengakses same-origin/lewat nginx; daftar ini untuk kasus
// cross-origin yang sah (dev tools, dsb.). Override lewat env CORS_ORIGINS (csv).
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'https://energy.edifly-si.com,http://energy.edifly-si.com,http://localhost:5173,http://localhost:8080')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

fastify.register(require('@fastify/cors'), { origin: CORS_ORIGINS });

// Rate limiting (SEC-08): default global 100 req/menit per IP; endpoint auth
// memakai batas lebih ketat lewat `config.rateLimit` di route.
fastify.register(require('@fastify/rate-limit'), {
  global: true,
  max: 100,
  timeWindow: '1 minute',
});

// --- Diagnostik sementara (env-gated) -------------------------------------
// Menulis satu baris per request ke SPKLU_ACCESS_LOG agar masalah "endpoint
// tidak dipanggil / dipanggil tapi ditolak" bisa dibedakan dari sisi server.
// Tidak aktif bila env tidak diisi; hapus blok ini setelah diagnosis selesai.
if (process.env.SPKLU_ACCESS_LOG) {
  const fs = require('fs');
  fastify.addHook('onResponse', async (request, reply) => {
    try {
      const line = [
        new Date().toISOString(),
        request.method,
        request.url,
        reply.statusCode,
        request.ip,
        (request.headers['user-agent'] || '').slice(0, 60),
        (request.headers['authorization'] ? 'token:yes' : 'token:no'),
      ].join(' | ') + '\n';
      fs.appendFileSync(process.env.SPKLU_ACCESS_LOG, line);
    } catch (_) {
      // diagnostik tidak boleh mengganggu request
    }
  });
}

// SEC-09: docs (Swagger UI + OpenAPI JSON) hanya aktif bila ENABLE_DOCS=true —
// jangan ekspos peta endpoint/skema API di produksi.
if (process.env.ENABLE_DOCS === 'true') {
  fastify.register(require('@fastify/swagger'), {
    openapi: {
      info: {
        title: 'SPKLU API',
        description: 'SPKLU EV Charging — REST API',
        version: '1.0.0',
      },
      servers: [{ url: '/spklu/api' }], // base publik (relatif ke origin; nginx proxy /spklu/api/* → :8080)
      tags: [
        { name: 'auth', description: 'Autentikasi & akun' },
        { name: 'user', description: 'Profil & saldo pengguna' },
        { name: 'chargebox', description: 'Chargebox / stasiun pengisian' },
        { name: 'informasi', description: 'Berita, histori, informasi' },
        { name: 'transaction', description: 'Order & charging' },
        { name: 'wallet', description: 'Wallet agent' },
        { name: 'callback', description: 'Callback pembayaran' },
        { name: 'nonocpp', description: 'Charging non-OCPP' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Token JWT — mobile (login menghasilkan key HMAC) atau admin (scope=admin).',
          },
          keyHeader: {
            type: 'apiKey',
            in: 'header',
            name: 'key-header',
            description: 'Shared secret untuk endpoint mobile pra-login (login/registrasi/OTP/reset).',
          },
        },
      },
    },
  });

  fastify.register(require('@fastify/swagger-ui'), {
    routePrefix: '/docs',
  });
}

// --- routes ---
fastify.get('/', async () => 'OK');

fastify.register(require('./src/routes/auth.routes'));
fastify.register(require('./src/routes/user.routes'));
fastify.register(require('./src/routes/chargebox.routes'));
fastify.register(require('./src/routes/informasi.routes'));
fastify.register(require('./src/routes/transaction.routes'));
fastify.register(require('./src/routes/wallet.routes'));
fastify.register(require('./src/routes/callback.routes'));
fastify.register(require('./src/routes/nonocpp.routes'));
fastify.register(require('./src/routes/admin.routes'));
// Promo: portal mitra (hotel/asuransi), ATPM (M2M), dan iklan untuk mobile.
fastify.register(require('./src/routes/portal.routes'));
fastify.register(require('./src/routes/atpm.routes'));
fastify.register(require('./src/routes/promo-mobile.routes'));

// Pesan 400 harus ACTIONABLE. Sebelumnya semua 400 disamakan menjadi
// "Permintaan tidak valid", sehingga body JSON yang salah (mis. koma berlebih
// sebelum '}') tidak bisa dibedakan dari field yang kurang — klien hanya
// menerima pesan generik dan harus menebak. Yang diungkap di sini hanya
// informasi tentang REQUEST klien itu sendiri (sintaks JSON, nama field),
// bukan detail internal seperti stack trace, query SQL, atau nama tabel.
function clientErrorMessage(error) {
  switch (error.code) {
    case 'FST_ERR_CTP_INVALID_JSON_BODY':
      return 'Body bukan JSON yang valid. Periksa sintaks JSON — koma berlebih sebelum "}" atau "]" adalah penyebab paling umum.';
    case 'FST_ERR_CTP_EMPTY_JSON_BODY':
      return 'Body JSON kosong.';
    case 'FST_ERR_CTP_INVALID_MEDIA_TYPE':
      return 'Content-Type tidak didukung. Gunakan application/json.';
    case 'FST_ERR_CTP_BODY_TOO_LARGE':
      return 'Body terlalu besar.';
    default:
      break;
  }
  // Validasi schema: sebutkan field yang bermasalah.
  if (Array.isArray(error.validation) && error.validation.length > 0) {
    const parts = error.validation.slice(0, 5).map((v) => {
      // Fastify 4 = instancePath, versi lama = dataPath.
      const raw = v.instancePath ?? v.dataPath ?? '';
      const path = raw ? raw.replace(/^\//, '').replace(/\//g, '.') : '(root)';
      return `${path}: ${v.message}`;
    });
    const more = error.validation.length > 5 ? ` (+${error.validation.length - 5} lainnya)` : '';
    return `Permintaan tidak valid — ${parts.join('; ')}${more}`;
  }
  return null;
}

// SEC-09: global error handler — log detail internal (dengan request id), tapi
// kirim pesan generik ke klien (jangan bocorkan stack / pesan galat internal).
fastify.setErrorHandler((error, request, reply) => {
  const reqId = request.id;
  console.error(`[error ${reqId}]`, error.message, error.stack || '');
  const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
  const detail = clientErrorMessage(error);
  const message =
    status === 429 ? 'Terlalu banyak permintaan' :
    status === 404 ? 'Route tidak ditemukan' :
    status === 400 ? (detail || 'Permintaan tidak valid') :
    'Terjadi kesalahan';
  return reply.code(status).send({ success: false, message, data: null });
});

// --- crash guard (legacy behavior) ---
process.on('uncaughtException', (err) => {
  console.error(err);
  console.log('Node NOT Exiting...');
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

// --- start ---
const PORT = 8080;

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    // Attach the OCPP WebSocket upgrade handler to the underlying HTTP server.
    fastify.server.on('upgrade', rpcServer.handleUpgrade);
    console.log(`Fastify is listening on port ${PORT}!`);

    startNonOcppServer(8484);
    startScheduler();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
