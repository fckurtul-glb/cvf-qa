import type { FastifyInstance } from 'fastify';
import { requireAuth, requireRole } from '../../middleware/auth';

export async function usersRoutes(app: FastifyInstance) {
  // TODO: Implement users routes per API endpoint map
  app.get('/', { preHandler: requireAuth }, async (request, reply) => {
    reply.send({ module: 'users', status: 'not_implemented' });
  });
}
