import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fjwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import cookie from '@fastify/cookie';
import { config } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { globalRateLimit } from './middleware/rate-limiter';
import { registerCsrf, csrfGuard } from './middleware/csrf';
import { authRoutes } from './modules/auth/routes';
import { userRoutes } from './modules/users/routes';
import { surveyRoutes } from './modules/survey/routes';
import { campaignRoutes } from './modules/campaigns/routes';
import { analyticsRoutes } from './modules/analytics/routes';
import { reportsRoutes } from './modules/reports/routes';
import { assessment360Routes } from './modules/assessment360/routes';
import { organizationsRoutes, inviteRoutes } from './modules/organizations/routes';
import { contactRoutes } from './modules/contact/routes';
import { emailWorker } from './jobs/email-sender';

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

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", ...config.CORS_ORIGINS.split(',')],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // needed for SPA API
  });

  await app.register(fjwt, {
    secret: config.JWT_SECRET,
  });

  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  });

  await app.register(cookie, {
    secret: config.JWT_SECRET,
  });

  // ── Error Handler ──
  app.setErrorHandler(errorHandler);

  // ── Global Rate Limit ──
  app.addHook('onRequest', globalRateLimit);

  // ── CSRF Protection ──
  registerCsrf(app);
  app.addHook('preHandler', csrfGuard);

  // ── Health Check ──
  app.get('/health', { config: { skipCsrf: true } as any }, async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  }));

  // ── Routes ──
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(userRoutes, { prefix: '/users' });
  await app.register(surveyRoutes, { prefix: '/survey' });
  await app.register(campaignRoutes, { prefix: '/campaigns' });
  await app.register(analyticsRoutes, { prefix: '/analytics' });
  await app.register(reportsRoutes, { prefix: '/reports' });
  await app.register(assessment360Routes, { prefix: '/360' });
  await app.register(organizationsRoutes, { prefix: '/organizations' });
  await app.register(inviteRoutes, { prefix: '/invite' });
  await app.register(contactRoutes, { prefix: '/contact' });

  // ── Email Worker ──
  app.log.info(`Email worker başlatıldı (concurrency: 5)`);

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
    await emailWorker.close();
    await app.close();
    process.exit(0);
  });
}
