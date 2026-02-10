import type { FastifyInstance } from 'fastify';
import { createRateLimiter } from '../../middleware/rate-limiter';

export async function surveyRoutes(app: FastifyInstance) {
  // GET /survey/start?t={token} — Anket başlat (token doğrulama)
  app.get('/start', {
    preHandler: createRateLimiter({ window: 60_000, max: 10 }),
  }, async (request, reply) => {
    const { t: token } = request.query as { t: string };
    // TODO: Token doğrulama, fingerprint, session oluşturma
    reply.send({ status: 'survey_start', token });
  });

  // POST /survey/save — Otomatik kaydetme (auto-save)
  app.post('/save', {
    preHandler: createRateLimiter({ window: 60_000, max: 120 }),
  }, async (request, reply) => {
    // TODO: Session doğrula, yanıtları kaydet
    reply.send({ success: true, savedAt: new Date().toISOString() });
  });

  // POST /survey/submit — Anketi tamamla (token invalidation)
  app.post('/submit', {
    preHandler: createRateLimiter({ window: 60_000, max: 5 }),
  }, async (request, reply) => {
    // TODO: Yanıtları validate et, session kapat, token invalidate et
    reply.send({ success: true, message: 'Anket tamamlandı. Teşekkürler!' });
  });
}
