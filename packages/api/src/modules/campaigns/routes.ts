import type { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../../middleware/auth';

export async function campaignRoutes(app: FastifyInstance) {
  // POST /campaigns — Yeni kampanya oluştur
  app.post('/', { preHandler: requireRole('ORG_ADMIN', 'SUPER_ADMIN') }, async (request, reply) => {
    // TODO: Kampanya oluşturma servisi
    reply.status(201).send({ success: true });
  });

  // POST /campaigns/:id/launch — Kampanyayı başlat, token dağıt
  app.post('/:id/launch', { preHandler: requireRole('ORG_ADMIN') }, async (request, reply) => {
    // TODO: Token üretimi, e-posta dağıtımı (BullMQ job)
    reply.send({ success: true, message: 'Kampanya başlatıldı' });
  });

  // GET /campaigns/:id/status — İlerleme durumu (WebSocket destekli)
  app.get('/:id/status', { preHandler: requireAuth }, async (request, reply) => {
    // TODO: Canlı istatistikler
    reply.send({ total: 0, completed: 0, responseRate: 0 });
  });
}
