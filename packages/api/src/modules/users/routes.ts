import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireRole } from '../../middleware/auth';
import { userService } from './service';

export async function userRoutes(app: FastifyInstance) {
  // POST /users/import — CSV ile toplu kullanıcı yükleme
  app.post(
    '/import',
    { preHandler: [requireRole('SUPER_ADMIN', 'ORG_ADMIN')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const file = await request.file();

      if (!file) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'CSV dosyası gereklidir' },
        });
      }

      if (!file.filename.endsWith('.csv')) {
        return reply.status(400).send({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Sadece .csv dosyaları kabul edilir' },
        });
      }

      const buffer = await file.toBuffer();
      const csvContent = buffer.toString('utf-8');

      const { org, sub } = request.user as { org: string; sub: string };

      try {
        const result = await userService.importCSV(org, csvContent, sub);
        reply.send({ success: true, data: result });
      } catch (err: any) {
        return reply.status(400).send({
          success: false,
          error: { code: 'IMPORT_ERROR', message: err.message },
        });
      }
    },
  );

  // GET /users — Kullanıcı listesi
  app.get(
    '/',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { org } = request.user as { org: string };
      const { page, limit } = request.query as { page?: string; limit?: string };

      const result = await userService.list(org, Number(page) || 1, Number(limit) || 50);

      reply.send({ success: true, data: result });
    },
  );
}
