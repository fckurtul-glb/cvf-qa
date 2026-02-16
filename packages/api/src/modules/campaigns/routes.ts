import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCampaignSchema, updateCampaignSchema } from './schema';
import { campaignService } from './service';
import { prisma } from '../../config/database';

export async function campaignRoutes(app: FastifyInstance) {
  // POST /campaigns — Yeni kampanya oluştur
  app.post('/', { preHandler: requireRole('ORG_ADMIN', 'SUPER_ADMIN'), preValidation: [validate(createCampaignSchema)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { sub, org } = request.user as { sub: string; org: string };
    const body = request.body as {
      name: string;
      description?: string;
      modules: string[];
      targetGroups: string[];
      closesAt: string;
    };

    try {
      const campaign = await campaignService.create({
        orgId: org,
        name: body.name,
        description: body.description,
        modules: body.modules,
        targetGroups: body.targetGroups,
        closesAt: new Date(body.closesAt),
        createdBy: sub,
      });

      reply.status(201).send({ success: true, data: campaign });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'CREATE_ERROR', message: err.message },
      });
    }
  });

  // GET /campaigns — Kampanya listesi (org filtreli)
  app.get('/', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { sub: string; org: string };

    const campaigns = await prisma.surveyCampaign.findMany({
      where: { orgId: org },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { tokens: true, responses: true } },
      },
    });

    const data = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.status,
      modules: c.moduleConfigJson,
      targetGroups: c.targetGroups,
      startedAt: c.startedAt,
      closesAt: c.closesAt,
      createdAt: c.createdAt,
      totalInvited: c._count.tokens,
      totalResponses: c._count.responses,
    }));

    reply.send({ success: true, data });
  });

  // GET /campaigns/:id — Kampanya detayı + istatistikler
  app.get('/:id', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { org } = request.user as { sub: string; org: string };

    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id },
      include: {
        _count: { select: { tokens: true, responses: true } },
      },
    });

    if (!campaign || campaign.orgId !== org) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kampanya bulunamadı' },
      });
    }

    // Yanıt durumu dağılımı
    const responses = await prisma.surveyResponse.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: true,
    });
    const statusMap = Object.fromEntries(responses.map((r) => [r.status, r._count]));

    reply.send({
      success: true,
      data: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        status: campaign.status,
        modules: campaign.moduleConfigJson,
        targetGroups: campaign.targetGroups,
        startedAt: campaign.startedAt,
        closesAt: campaign.closesAt,
        createdAt: campaign.createdAt,
        stats: {
          totalInvited: campaign._count.tokens,
          totalResponses: campaign._count.responses,
          completed: statusMap['COMPLETED'] ?? 0,
          inProgress: statusMap['IN_PROGRESS'] ?? 0,
          notStarted: (campaign._count.tokens) - (statusMap['COMPLETED'] ?? 0) - (statusMap['IN_PROGRESS'] ?? 0),
          responseRate: campaign._count.tokens > 0
            ? Math.round(((statusMap['COMPLETED'] ?? 0) / campaign._count.tokens) * 100)
            : 0,
        },
      },
    });
  });

  // PUT /campaigns/:id — Kampanya güncelle
  app.put('/:id', { preHandler: requireRole('ORG_ADMIN', 'SUPER_ADMIN'), preValidation: [validate(updateCampaignSchema)] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { org } = request.user as { sub: string; org: string };
    const body = request.body as {
      name?: string;
      description?: string;
      modules?: string[];
      targetGroups?: string[];
      closesAt?: string;
      status?: string;
    };

    const campaign = await prisma.surveyCampaign.findUnique({ where: { id } });
    if (!campaign || campaign.orgId !== org) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kampanya bulunamadı' },
      });
    }

    // Sadece DRAFT kampanyalar düzenlenebilir
    if (campaign.status !== 'DRAFT' && body.modules) {
      return reply.status(400).send({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Aktif kampanyanın modülleri değiştirilemez' },
      });
    }

    const updated = await prisma.surveyCampaign.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.modules && { moduleConfigJson: body.modules }),
        ...(body.targetGroups && { targetGroups: body.targetGroups }),
        ...(body.closesAt && { closesAt: new Date(body.closesAt) }),
        ...(body.status && { status: body.status as any }),
      },
    });

    reply.send({ success: true, data: updated });
  });

  // POST /campaigns/:id/launch — Kampanyayı başlat
  app.post('/:id/launch', { preHandler: requireRole('ORG_ADMIN') }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { sub } = request.user as { sub: string; org: string };

    try {
      const result = await campaignService.launch(id, sub);
      reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'LAUNCH_ERROR', message: err.message },
      });
    }
  });

  // GET /campaigns/:id/status — Yanıt oranları
  app.get('/:id/status', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const status = await campaignService.getStatus(id);
      reply.send({ success: true, data: status });
    } catch (err: any) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: err.message },
      });
    }
  });

  // GET /campaigns/dashboard-stats — Dashboard özet istatistikleri
  app.get('/dashboard-stats', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { sub: string; org: string };

    const [campaigns, totalResponses, totalReports] = await Promise.all([
      prisma.surveyCampaign.findMany({
        where: { orgId: org },
        include: { _count: { select: { tokens: true, responses: true } } },
      }),
      prisma.surveyResponse.count({
        where: { campaign: { orgId: org }, status: 'COMPLETED' },
      }),
      prisma.auditLog.count({
        where: { orgId: org, action: 'report.generate' },
      }),
    ]);

    const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE').length;
    const totalInvited = campaigns.reduce((sum, c) => sum + c._count.tokens, 0);
    const avgResponseRate = totalInvited > 0 ? Math.round((totalResponses / totalInvited) * 100) : 0;

    // Modül bazlı yanıt oranları
    const moduleStats = await prisma.surveyAnswer.groupBy({
      by: ['moduleCode'],
      where: { response: { campaign: { orgId: org }, status: 'COMPLETED' } },
      _count: true,
    });

    reply.send({
      success: true,
      data: {
        activeCampaigns,
        totalResponses,
        avgResponseRate,
        totalReports,
        moduleStats: moduleStats.map((m) => ({
          name: m.moduleCode,
          count: m._count,
        })),
      },
    });
  });

  // POST /campaigns/:id/remind — Hatırlatma gönder
  app.post('/:id/remind', { preHandler: requireRole('ORG_ADMIN') }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await campaignService.sendReminders(id);
      reply.send({ success: true, data: result });
    } catch (err: any) {
      return reply.status(400).send({
        success: false,
        error: { code: 'REMIND_ERROR', message: err.message },
      });
    }
  });
}
