import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const statusCode = error.statusCode || 500;
  request.log.error({ err: error, statusCode }, 'Request error');
  reply.status(statusCode).send({
    success: false,
    error: { code: error.code || 'INTERNAL_ERROR', message: statusCode === 500 ? 'Internal Server Error' : error.message },
  });
}
