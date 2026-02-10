import type { FastifyInstance } from 'fastify';
import { authService } from './service';
import { registerSchema, loginSchema } from './schema';
import { requireAuth } from '../../middleware/auth';

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register — Yeni kullanıcı kaydı
  app.post('/register', { schema: registerSchema }, async (request, reply) => {
    const { email, password, name } = request.body as { email: string; password: string; name?: string };
    const result = await authService.register(email, password, name);

    if (!result.success) {
      return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: result.error } });
    }

    const token = app.jwt.sign(
      { sub: result.user!.id, org: result.user!.org, role: result.user!.role },
      { expiresIn: '15m' },
    );

    reply.status(201).send({
      success: true,
      data: { user: result.user, accessToken: token },
    });
  });

  // POST /auth/login — E-posta + Şifre girişi
  app.post('/login', { schema: loginSchema }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };
    const result = await authService.login(email, password, request.ip, request.headers['user-agent']);

    if (!result.success) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: result.error } });
    }

    const token = app.jwt.sign(
      { sub: result.user!.id, org: result.user!.org, role: result.user!.role, stakeholder: result.user!.stakeholder },
      { expiresIn: '15m' },
    );

    reply.send({
      success: true,
      data: { user: result.user, accessToken: token },
    });
  });

  // GET /auth/me — Token ile kullanıcı bilgisi
  app.get('/me', { preHandler: [requireAuth] }, async (request, reply) => {
    const { sub } = request.user as { sub: string };
    const result = await authService.getProfile(sub);

    if (!result.success) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: result.error } });
    }

    reply.send({ success: true, data: result.data });
  });
}
