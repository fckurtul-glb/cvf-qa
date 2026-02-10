import type { FastifyRequest, FastifyReply } from 'fastify';
import { redis } from '../config/redis';

export function createRateLimiter(config: { window: number; max: number }) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = `rl:${request.routeOptions.url}:${request.ip}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.pexpire(key, config.window);
    if (count > config.max) {
      reply.status(429).send({ success: false, error: { code: 'RATE_LIMITED', message: 'Çok fazla istek' } });
    }
  };
}
