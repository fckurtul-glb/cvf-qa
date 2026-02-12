import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { reportService } from './service';

export async function reportsRoutes(app: FastifyInstance) {
  // GET /reports — Rapor listesi
  app.get('/', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { sub: string; org: string };
    const result = await reportService.listReports(org);
    reply.send({ success: true, data: result.data });
  });

  // POST /reports/generate — Yeni rapor oluştur
  app.post('/generate', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { sub, org } = request.user as { sub: string; org: string };
    const { campaignId } = request.body as { campaignId: string };

    if (!campaignId) {
      return reply.status(400).send({ success: false, error: { code: 'MISSING_FIELD', message: 'campaignId gerekli' } });
    }

    const result = await reportService.generateReport(campaignId, org, sub);

    if (!result.success) {
      return reply.status(400).send({ success: false, error: { code: 'REPORT_ERROR', message: result.error } });
    }

    reply.send({ success: true, data: result.data });
  });

  // GET /reports/:id/download — PDF indir
  app.get('/:id/download', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { sub: string; org: string };
    const { id } = request.params as { id: string };

    const result = await reportService.downloadReport(id, org);

    if (!result.success) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
    }

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${result.data!.filename}"`)
      .send(result.data!.buffer);
  });
}
