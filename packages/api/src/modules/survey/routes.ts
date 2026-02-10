import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { surveyService } from './service';
import questionBank from '../../data/question-bank.json';

export async function surveyRoutes(app: FastifyInstance) {
  // GET /survey/ocai/questions — OCAI soru setini döndür
  app.get('/ocai/questions', { preHandler: [requireAuth] }, async (_request, reply) => {
    const ocai = questionBank.modules.M1_OCAI;
    reply.send({
      success: true,
      data: {
        name: ocai.name,
        source: ocai.source,
        format: ocai.format,
        totalPoints: ocai.totalPoints,
        instruction: ocai.instruction,
        cultureTypes: ocai.cultureTypes,
        perspectives: ocai.perspectives,
        dimensions: ocai.dimensions,
      },
    });
  });

  // POST /survey/submit — OCAI yanıtlarını kaydet
  app.post('/submit', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { sub, org } = request.user as { sub: string; org: string };
    const { answers } = request.body as {
      answers: Record<string, Record<string, Record<string, number>>>;
      // answers[dimensionId][perspective][alternative] = points
    };

    if (!answers || typeof answers !== 'object') {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Yanıtlar gereklidir' },
      });
    }

    try {
      const result = await surveyService.submitOCAI(org, sub, answers);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: result.error },
        });
      }

      reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: { code: 'SUBMIT_ERROR', message: err.message },
      });
    }
  });
}
