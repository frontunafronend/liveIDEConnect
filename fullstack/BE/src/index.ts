import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import { authRoutes } from './routes/auth.routes';
import { sessionsRoutes } from './routes/sessions.routes';
import { messagesRoutes } from './routes/messages.routes';
import { wsRoutes } from './routes/ws.routes';
import { initDatabase } from './db/migrations';
import { closeDbPool, testConnection } from './db/connection';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

async function build() {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
    } else {
      try {
        await initDatabase();
        try {
          const { seedDatabase } = await import('./db/seed');
          await seedDatabase();
        } catch (error) {
        }
      } catch (error) {
      }
    }
  } catch (error) {
  }

  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: false
  });

  await fastify.register(websocket);

  await fastify.register(authRoutes);
  await fastify.register(sessionsRoutes);
  await fastify.register(messagesRoutes);
  await fastify.register(wsRoutes);
  
  const { adminRoutes } = await import('./routes/admin.routes');
  await fastify.register(adminRoutes);
  fastify.get('/health', async () => {
    const dbStatus = await testConnection();
    return {
      status: 'ok',
      database: dbStatus ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    };
  });

  return fastify;
}

async function start() {
  try {
    const app = await build();
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await closeDbPool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDbPool();
  process.exit(0);
});

start();

