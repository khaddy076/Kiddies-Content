import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { config } from './config.js';
import { parentAuthRoutes } from './routes/parent-auth.routes.js';
import { childAuthRoutes } from './routes/child-auth.routes.js';

const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: config.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

async function buildApp() {
  await fastify.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } });
  await fastify.register(cors, {
    origin: [config.WEB_URL, 'http://localhost:3000', 'http://localhost:19006'],
    credentials: true,
  });
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  });
  await fastify.register(cookie);
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
  });

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'auth',
    timestamp: new Date().toISOString(),
  }));

  // Routes
  await fastify.register(parentAuthRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(childAuthRoutes, { prefix: '/api/v1' });

  return fastify;
}

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: config.AUTH_PORT, host: '0.0.0.0' });
    console.log(`✅ Auth service running on port ${config.AUTH_PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await fastify.close();
  process.exit(0);
});

void start();
