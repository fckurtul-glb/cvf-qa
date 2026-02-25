import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { surveyService } from './service';
import { prisma } from '../../config/database';
import questionBank from '../../data/question-bank.json';

type JWTPayload = { sub: string; org: string; role: string };

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

  // GET /survey/qci/questions — QCI-TR soru setini döndür
  app.get('/qci/questions', { preHandler: [requireAuth] }, async (_request, reply) => {
    const qci = questionBank.modules.M2_QCI;
    reply.send({
      success: true,
      data: {
        name: qci.name,
        source: qci.source,
        format: qci.format,
        scale: qci.scale,
        questionCount: qci.questionCount,
        subdimensions: qci.subdimensions,
      },
    });
  });

  // GET /survey/uwes/questions — UWES-TR soru setini döndür
  app.get('/uwes/questions', { preHandler: [requireAuth] }, async (_request, reply) => {
    const uwes = questionBank.modules.M4_UWES;
    reply.send({
      success: true,
      data: {
        name: uwes.name,
        source: uwes.source,
        format: uwes.format,
        scale: uwes.scale,
        questionCount: uwes.questionCount,
        subdimensions: uwes.subdimensions,
      },
    });
  });

  // GET /survey/pke/questions — PKE soru setini döndür
  app.get('/pke/questions', { preHandler: [requireAuth] }, async (_request, reply) => {
    const pke = questionBank.modules.M5_PKE;
    reply.send({
      success: true,
      data: {
        name: pke.name,
        source: pke.source,
        format: pke.format,
        scale: pke.scale,
        questionCount: pke.questionCount,
        subdimensions: pke.subdimensions,
      },
    });
  });

  // GET /survey/spu/questions — SPU soru setini döndür
  app.get('/spu/questions', { preHandler: [requireAuth] }, async (_request, reply) => {
    const spu = questionBank.modules.M6_SPU;
    reply.send({
      success: true,
      data: {
        name: spu.name,
        source: spu.source,
        format: spu.format,
        scale: spu.scale,
        questionCount: spu.questionCount,
        items: spu.items,
      },
    });
  });

  // GET /survey/msai/questions — MSAI-YÖ 360° soru setini döndür
  app.get('/msai/questions', { preHandler: [requireAuth] }, async (_request, reply) => {
    const msai = (questionBank.modules as any).M3_MSAI;
    reply.send({
      success: true,
      data: {
        name: msai.name,
        source: msai.source,
        format: msai.format,
        scale: msai.scale,
        questionCount: msai.questionCount,
        targetGroup: msai.targetGroup,
        instruction: msai.instruction,
        subdimensions: msai.subdimensions,
      },
    });
  });

  // GET /survey/start — Token doğrulama ve anket session başlat
  app.get('/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const { t } = request.query as { t?: string };

    if (!t) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Token gereklidir' },
      });
    }

    const result = await surveyService.validateToken(t);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'TOKEN_ERROR', message: result.error },
      });
    }

    reply.send({ success: true, data: result.data });
  });

  // POST /survey/consent — KVKK onayı + demografik bilgi kaydet
  app.post('/consent', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      tokenHash: string;
      consentGiven: boolean;
      demographic?: { seniorityRange?: string; ageRange?: string };
    };

    if (!body.tokenHash || !body.consentGiven) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Token ve onay gereklidir' },
      });
    }

    const result = await surveyService.recordConsent(
      body.tokenHash,
      body.demographic,
      request.ip || 'unknown',
      request.headers['user-agent'] || 'unknown',
    );

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CONSENT_ERROR', message: result.error },
      });
    }

    reply.send({ success: true, data: result.data });
  });

  // POST /survey/save — Otomatik kaydetme (auto-save)
  app.post('/save', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      responseId: string;
      moduleCode: string;
      answers: Record<string, number>;
    };

    if (!body.responseId || !body.moduleCode || !body.answers) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'responseId, moduleCode ve answers gereklidir' },
      });
    }

    const result = await surveyService.autoSave(body.responseId, body.moduleCode, body.answers);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'SAVE_ERROR', message: result.error },
      });
    }

    reply.send({ success: true, data: result });
  });

  // GET /survey/result/:id — Sonuçları hesapla ve döndür
  // ?module=QCI|UWES|PKE|SPU → Likert sonuçlar, yoksa OCAI
  app.get('/result/:id', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { module: moduleParam } = request.query as { module?: string };
    const { org } = request.user as JWTPayload;

    // FIX A: Cross-org data leak guard — verify this response belongs to caller's org
    const check = await prisma.surveyResponse.findUnique({
      where: { id },
      select: { campaign: { select: { orgId: true } } },
    });
    if (!check || check.campaign.orgId !== org) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Yanıt bulunamadı' },
      });
    }

    const LIKERT_MODULES: Record<string, string> = {
      QCI: 'M2_QCI',
      UWES: 'M4_UWES',
      PKE: 'M5_PKE',
      SPU: 'M6_SPU',
      MSAI: 'M3_MSAI',
    };

    let result;
    if (moduleParam && LIKERT_MODULES[moduleParam]) {
      result = await surveyService.getLikertResult(id, LIKERT_MODULES[moduleParam]);
    } else {
      result = await surveyService.getResult(id);
    }

    if (!result.success) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: result.error },
      });
    }

    reply.send({ success: true, data: result.data });
  });

  // POST /survey/submit — Anket yanıtlarını kaydet (OCAI, QCI, UWES)
  app.post('/submit', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { sub, org } = request.user as { sub: string; org: string };
    const body = request.body as {
      moduleCode?: string;
      answers: Record<string, any>;
    };

    const { answers, moduleCode } = body;

    if (!answers || typeof answers !== 'object') {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Yanıtlar gereklidir' },
      });
    }

    try {
      let result;

      const LIKERT_CODES = ['M2_QCI', 'M4_UWES', 'M5_PKE', 'M6_SPU', 'M3_MSAI'];
      if (moduleCode && LIKERT_CODES.includes(moduleCode)) {
        result = await surveyService.submitLikert(org, sub, moduleCode as any, answers as Record<string, number>);
      } else {
        result = await surveyService.submitOCAI(org, sub, answers as Record<string, Record<string, Record<string, number>>>);
      }

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
