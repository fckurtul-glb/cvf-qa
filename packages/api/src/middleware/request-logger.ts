import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';

export function requestLogger(request: FastifyRequest, _reply: FastifyReply, done: HookHandlerDoneFunction) {
  request.log.info({ method: request.method, url: request.url, ip: request.ip }, 'incoming request');
  done();
}
