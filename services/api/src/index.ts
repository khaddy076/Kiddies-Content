import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { redis } from './redis.js';
import { parentRoutes } from './routes/parent.routes.js';
import { childRoutes } from './routes/child.routes.js';
import { contentRoutes } from './routes/content.routes.js';

const fastify = Fastify({
  logger: config.NODE_ENV !== 'production'
    ? { level: 'info' as const, transport: { target: 'pino-pretty', options: { colorize: true } } }
    : { level: 'warn' as const },
});

// Active WebSocket connections: userId → socket set
const wsConnections = new Map<string, Set<ReturnType<typeof fastify['websocketServer']['clients']['values']> extends IterableIterator<infer T> ? T : never>>();

async function buildApp() {
  await fastify.register(helmet, { contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } });
  await fastify.register(cors, {
    origin: [config.WEB_URL, 'http://localhost:3000', 'http://localhost:19006'],
    credentials: true,
  });
  await fastify.register(rateLimit, {
    max: config.NODE_ENV === 'production' ? 200 : 1000,
    timeWindow: '1 minute',
  });
  await fastify.register(cookie);
  await fastify.register(jwt, { secret: config.JWT_SECRET });
  await fastify.register(websocket);

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'api',
    timestamp: new Date().toISOString(),
    redis: redis.status,
  }));

  // WebSocket for real-time approval updates
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const token = (req.query as { token?: string }).token;
    if (!token) {
      connection.socket.close(1008, 'Authentication required');
      return;
    }

    try {
      const payload = fastify.jwt.verify(token) as { sub: string };
      const userId = payload.sub;

      if (!wsConnections.has(userId)) wsConnections.set(userId, new Set());
      wsConnections.get(userId)!.add(connection.socket as never);

      connection.socket.on('close', () => {
        wsConnections.get(userId)?.delete(connection.socket as never);
      });

      connection.socket.send(JSON.stringify({ type: 'connected', userId }));
    } catch {
      connection.socket.close(1008, 'Invalid token');
    }
  });

  // API Routes
  await fastify.register(parentRoutes, { prefix: '/api/v1/parent' });
  await fastify.register(childRoutes, { prefix: '/api/v1/child' });
  await fastify.register(contentRoutes, { prefix: '/api/v1/content' });

  // Recommendations routes (inline)
  fastify.get('/api/v1/recommendations/child/:childId', async (req, reply) => {
    return reply.send({ success: true, data: [], message: 'Use recommendation service' });
  });

  return fastify;
}

async function start() {
  try {
    const app = await buildApp();
    await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
    console.log(`✅ API service running on port ${config.API_PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await fastify.close();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await fastify.close();
  await redis.quit();
  process.exit(0);
});

void start();
