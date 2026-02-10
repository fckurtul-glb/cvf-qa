import Fastify from 'fastify';
import cors from '@fastify/cors';
import fjwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { config } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { authRoutes } from './modules/auth/routes';
import { userRoutes } from './modules/users/routes';
import { surveyRoutes } from './modules/survey/routes';

const app = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  trustProxy: true,
});

async function bootstrap() {
  // ── Plugins ──
  await app.register(cors, {
    origin: config.CORS_ORIGINS.split(','),
    credentials: true,
  });

  await app.register(fjwt, {
    secret: config.JWT_SECRET,
  });

  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  });

  // ── Error Handler ──
  app.setErrorHandler(errorHandler);

  // ── Health Check ──
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

  // ── Routes ──
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(userRoutes, { prefix: '/users' });
  await app.register(surveyRoutes, { prefix: '/survey' });

  // ── Start ──
  const port = Number(config.PORT);
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`CVF-QA API → http://localhost:${port}`);
  app.log.info(`Health → http://localhost:${port}/health`);
}

bootstrap().catch((err) => {
  console.error('Server baslatılamadı:', err);
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    app.log.info(`${signal} alındı, kapatılıyor...`);
    await app.close();
    process.exit(0);
  });
}
