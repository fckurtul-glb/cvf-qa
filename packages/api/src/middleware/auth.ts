import type { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Geçersiz token' },
    });
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;

    if (!roles.includes((request as any).user?.role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Yetki yok' },
      });
    }
  };
}

/**
 * Org isolation guard: Ensures the authenticated user belongs to the
 * organization specified in the route params (:orgId or :id for org routes).
 * SUPER_ADMIN bypasses this check.
 */
export function requireOrgMember(paramName = 'id') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(request, reply);
    if (reply.sent) return;

    const user = (request as any).user as { sub: string; org: string; role: string };
    if (user.role === 'SUPER_ADMIN') return;

    const params = request.params as Record<string, string>;
    const targetOrgId = params[paramName];

    if (targetOrgId && targetOrgId !== user.org) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Bu kurum verilerine erişim yetkiniz yok' },
      });
    }
  };
}
