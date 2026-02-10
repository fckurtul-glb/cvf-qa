import type { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../../middleware/auth';

export async function reportsRoutes(app: FastifyInstance) {
  // TODO: Implement reports routes per API endpoint map
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    reply.send({ module: 'reports', status: 'not_implemented' });
  });
}
