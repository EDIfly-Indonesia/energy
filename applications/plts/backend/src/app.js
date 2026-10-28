require('dotenv').config();
const fastify = require('fastify')({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' 
      ? { target: 'pino-pretty', options: { colorize: true } } 
      : undefined
  }
});

// Import plugins
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const swagger = require('@fastify/swagger');
const swaggerUI = require('@fastify/swagger-ui');

// Import routes
const v1Routes = require('./api/routes/v1');

// Import schemas (OpenAPI)
const { entitySchemas } = require('./api/schemas/entities');

// Import middlewares
const { errorHandler } = require('./api/middlewares/error.middleware');

// Register plugins
fastify.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true
});

fastify.register(helmet);

fastify.register(rateLimit, {
  max: 2000,
  timeWindow: '1 minute',
  ban: 1,
  banPeriod: '1 minute',
});

// Swagger documentation
fastify.register(swagger, {
  openapi: {
    info: {
      title: 'PLTS SCADA Monitoring Platform API',
      description: 'API Documentation for PLTS SCADA Monitoring Platform',
      version: '1.0.0'
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 9000}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  refResolver: {
    // Gunakan $id schema (mis. 'User', 'Rate') sebagai nama di components.schemas
    // alih-alih default 'def-N'.
    buildLocalReference (json, baseUri, fragment, i) {
      return json.$id || json.title || `def-${i}`;
    }
  }
});

fastify.register(swaggerUI, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  }
});

// Register entity schemas agar muncul sebagai components.schemas di OpenAPI
// dan bisa direferensikan route via $ref.
//
// PENTING: setiap schema dipaksa `additionalProperties: true`. Tanpa ini,
// Fastify memakai schema untuk serialisasi (fast-json-stringify) dan akan
// MEMBUANG field response yang tidak dideklarasikan (mis. relasi `site`,
// `brand`, `type` pada Device) — menyebabkan bug runtime (marker peta hilang).
for (const schema of entitySchemas) {
  fastify.addSchema({ ...schema, additionalProperties: true });
}

// Register routes v1
// fastify.register(v1Routes, { prefix: `/api/${process.env.API_VERSION || 'v1'}` });
fastify.register(v1Routes, { prefix: `/plts/api/${process.env.API_VERSION || 'v1'}` });

// Health check
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1',
    uptime: process.uptime()
  };
});

// Error handler
fastify.setErrorHandler(errorHandler);

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 9000;
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port, host });
    fastify.log.info(`🚀 Server running on http://${host}:${port}`);
    fastify.log.info(`📚 Swagger UI available at http://${host}:${port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  fastify.log.info('Shutting down gracefully...');
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
