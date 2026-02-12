import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireRole } from '../../middleware/auth';
import { assessment360Service } from './service';

export async function assessment360Routes(app: FastifyInstance) {
  // POST /360 — Yeni 360° konfigürasyonu oluştur
  app.post('/', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org, sub } = request.user as { sub: string; org: string };
    const { campaignId, managerId } = request.body as { campaignId: string; managerId: string };

    if (!campaignId || !managerId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'campaignId ve managerId gereklidir' },
      });
    }

    const result = await assessment360Service.createConfig(campaignId, managerId, org, sub);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.error },
      });
    }

    reply.status(201).send({ success: true, data: result.data });
  });

  // GET /360 — Org bazlı 360° listesi
  app.get('/', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { org: string };
    const result = await assessment360Service.list(org);
    reply.send(result);
  });

  // GET /360/:configId — 360° detay
  app.get('/:configId', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { org: string };
    const { configId } = request.params as { configId: string };

    const result = await assessment360Service.getDetail(configId, org);

    if (!result.success) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: result.error },
      });
    }

    reply.send(result);
  });

  // POST /360/:configId/raters — Değerlendirici ata
  app.post('/:configId/raters', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { org: string };
    const { configId } = request.params as { configId: string };
    const { raters } = request.body as {
      raters: { userId: string; perspective: 'SELF' | 'SUBORDINATE' | 'PEER' | 'SUPERIOR' }[];
    };

    if (!raters || !Array.isArray(raters) || raters.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'En az bir değerlendirici gereklidir' },
      });
    }

    const validPerspectives = ['SELF', 'SUBORDINATE', 'PEER', 'SUPERIOR'];
    for (const r of raters) {
      if (!r.userId || !validPerspectives.includes(r.perspective)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Her değerlendirici için userId ve geçerli perspective gereklidir' },
        });
      }
    }

    const result = await assessment360Service.assignRaters(configId, org, raters);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.error },
      });
    }

    reply.send(result);
  });

  // POST /360/:configId/launch — 360° başlat (token üret + davet gönder)
  app.post('/:configId/launch', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org, sub } = request.user as { sub: string; org: string };
    const { configId } = request.params as { configId: string };

    const result = await assessment360Service.launch(configId, org, sub);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'LAUNCH_ERROR', message: result.error },
      });
    }

    reply.send(result);
  });

  // GET /360/:configId/report — 360° rapor
  app.get('/:configId/report', { preHandler: [requireAuth, requireRole('ADMIN')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { org: string };
    const { configId } = request.params as { configId: string };

    const result = await assessment360Service.getReport(configId, org);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'REPORT_ERROR', message: result.error },
      });
    }

    reply.send(result);
  });
}
