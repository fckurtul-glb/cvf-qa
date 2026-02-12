import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../config/database';

export async function analyticsRoutes(app: FastifyInstance) {
  // GET /analytics/dashboard — Dashboard istatistikleri
  app.get('/dashboard', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { sub: string; org: string };

    // Kampanya sayıları
    const [totalCampaigns, activeCampaigns] = await Promise.all([
      prisma.surveyCampaign.count({ where: { orgId: org } }),
      prisma.surveyCampaign.count({ where: { orgId: org, status: 'ACTIVE' } }),
    ]);

    // Toplam yanıt
    const totalResponses = await prisma.surveyResponse.count({
      where: { campaign: { orgId: org }, status: 'COMPLETED' },
    });

    // Ortalama yanıt oranı
    const campaigns = await prisma.surveyCampaign.findMany({
      where: { orgId: org, status: { in: ['ACTIVE', 'COMPLETED'] } },
      include: { _count: { select: { tokens: true, responses: true } } },
    });

    const avgRate = campaigns.length > 0
      ? Math.round(
          campaigns.reduce((sum, c) => {
            const rate = c._count.tokens > 0 ? (c._count.responses / c._count.tokens) * 100 : 0;
            return sum + rate;
          }, 0) / campaigns.length,
        )
      : 0;

    // Modül bazlı tamamlama
    const moduleStats = await prisma.surveyAnswer.groupBy({
      by: ['moduleCode'],
      where: { response: { campaign: { orgId: org }, status: 'COMPLETED' } },
      _count: true,
    });

    // Son 7 gün yanıt trendi
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentResponses = await prisma.surveyResponse.findMany({
      where: {
        campaign: { orgId: org },
        status: 'COMPLETED',
        completedAt: { gte: sevenDaysAgo },
      },
      select: { completedAt: true },
    });

    // Günlük gruplama
    const dailyTrend: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyTrend[d.toISOString().split('T')[0]] = 0;
    }
    for (const r of recentResponses) {
      if (r.completedAt) {
        const key = r.completedAt.toISOString().split('T')[0];
        if (dailyTrend[key] !== undefined) dailyTrend[key]++;
      }
    }

    // Aktif kampanyalar
    const activeCampaignList = await prisma.surveyCampaign.findMany({
      where: { orgId: org, status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: { _count: { select: { tokens: true, responses: true } } },
    });

    // Son yanıtlar
    const latestResponses = await prisma.surveyResponse.findMany({
      where: { campaign: { orgId: org }, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: {
        campaign: { select: { name: true } },
        answers: { select: { moduleCode: true }, distinct: ['moduleCode'] },
      },
    });

    reply.send({
      success: true,
      data: {
        stats: {
          totalCampaigns,
          activeCampaigns,
          totalResponses,
          avgResponseRate: avgRate,
        },
        moduleStats: moduleStats.map((m) => ({
          moduleCode: m.moduleCode,
          answerCount: m._count,
        })),
        dailyTrend: Object.entries(dailyTrend).map(([date, count]) => ({ date, count })),
        activeCampaigns: activeCampaignList.map((c) => ({
          id: c.id,
          name: c.name,
          totalInvited: c._count.tokens,
          totalResponses: c._count.responses,
          rate: c._count.tokens > 0 ? Math.round((c._count.responses / c._count.tokens) * 100) : 0,
        })),
        latestResponses: latestResponses.map((r) => ({
          id: r.id,
          campaignName: r.campaign.name,
          completedAt: r.completedAt,
          modules: r.answers.map((a) => a.moduleCode),
        })),
      },
    });
  });
}
