/**
 * Prisma Client Singleton
 *
 * Semua file harus menggunakan instance ini agar tidak membuat
 * connection pool baru di setiap module — mencegah memory leak
 * dan connection limit exceeded di production.
 *
 * Usage:
 *   const prisma = require('../config/database');
 */

'use strict';

const { PrismaClient, Prisma } = require('@prisma/client');

// Matikan log query di production
const LOG_LEVEL = process.env.NODE_ENV === 'production'
  ? ['error', 'warn']
  : ['error', 'warn']; // Query log disabled to reduce I/O

if (!global.__prisma) {
  global.__prisma = new PrismaClient({
    log: LOG_LEVEL,
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Attach Prisma namespace
  global.__prisma.Prisma = Prisma;

  // Graceful disconnect
  process.on('beforeExit', async () => {
    await global.__prisma.$disconnect();
  });
}

const prisma = global.__prisma;

module.exports = prisma;
