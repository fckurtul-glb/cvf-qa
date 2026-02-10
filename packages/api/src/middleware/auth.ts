import type { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try { await request.jwtVerify(); } 
  catch { reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Geçersiz token' } }); }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (!roles.includes((request as any).user?.role)) {
      reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Yetki yok' } });
    }
  };
}
