import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../../middleware/auth';
import { prisma } from '../../config/database';
import questionBank from '../../data/question-bank.json';

const OCAI = questionBank.modules.M1_OCAI;
const CULTURE_LABELS: Record<string, string> = { A: 'Klan', B: 'Adhokrasi', C: 'Pazar', D: 'Hiyerarşi' };

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

  // ══════════════════════════════════════════
  // GET /analytics/gap/:campaignId — Gap Analizi
  // ══════════════════════════════════════════
  app.get('/gap/:campaignId', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { org: string };
    const { campaignId } = request.params as { campaignId: string };

    const campaign = await prisma.surveyCampaign.findFirst({
      where: { id: campaignId, orgId: org },
      include: {
        responses: {
          where: { status: 'COMPLETED' },
          include: { answers: { where: { moduleCode: 'M1_OCAI' } } },
        },
      },
    });

    if (!campaign) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Kampanya bulunamadı' } });

    const ocaiResponses = campaign.responses.filter((r) => r.answers.length > 0);
    if (ocaiResponses.length === 0) {
      return reply.send({ success: true, data: { gaps: [], dimensions: [], responseCount: 0 } });
    }

    // Boyut bazlı gap hesapla
    const dimScores: Record<string, Record<string, { mevcut: number[]; tercih: number[] }>> = {};

    for (const resp of ocaiResponses) {
      for (const answer of resp.answers) {
        const data = answer.answerJson as { dimension: string; perspective: string; values: Record<string, number> };
        if (!data.dimension || !data.perspective || !data.values) continue;

        if (!dimScores[data.dimension]) {
          dimScores[data.dimension] = {};
          for (const alt of ['A', 'B', 'C', 'D']) {
            dimScores[data.dimension][alt] = { mevcut: [], tercih: [] };
          }
        }

        const bucket = data.perspective === 'mevcut' ? 'mevcut' : 'tercih';
        for (const alt of ['A', 'B', 'C', 'D']) {
          if (data.values[alt] !== undefined) {
            dimScores[data.dimension][alt][bucket].push(data.values[alt]);
          }
        }
      }
    }

    // Genel ve boyut bazlı gap
    const overallGaps: Record<string, { mevcut: number; tercih: number; gap: number }> = {};
    const allMevcut: Record<string, number[]> = { A: [], B: [], C: [], D: [] };
    const allTercih: Record<string, number[]> = { A: [], B: [], C: [], D: [] };

    const dimensions: any[] = [];

    for (const [dimId, alts] of Object.entries(dimScores)) {
      const dim = OCAI.dimensions.find((d: any) => d.id === dimId);
      const dimGaps: Record<string, { mevcut: number; tercih: number; gap: number }> = {};

      for (const alt of ['A', 'B', 'C', 'D']) {
        const mArr = alts[alt].mevcut;
        const tArr = alts[alt].tercih;
        const mMean = mArr.length > 0 ? mArr.reduce((s, v) => s + v, 0) / mArr.length : 0;
        const tMean = tArr.length > 0 ? tArr.reduce((s, v) => s + v, 0) / tArr.length : 0;
        const gap = Math.round((tMean - mMean) * 10) / 10;

        dimGaps[alt] = { mevcut: Math.round(mMean * 10) / 10, tercih: Math.round(tMean * 10) / 10, gap };
        allMevcut[alt].push(mMean);
        allTercih[alt].push(tMean);
      }

      dimensions.push({
        id: dimId,
        title: dim?.title || dimId,
        cultures: dimGaps,
      });
    }

    // Genel ortalama gap
    for (const alt of ['A', 'B', 'C', 'D']) {
      const mMean = allMevcut[alt].length > 0 ? allMevcut[alt].reduce((s, v) => s + v, 0) / allMevcut[alt].length : 0;
      const tMean = allTercih[alt].length > 0 ? allTercih[alt].reduce((s, v) => s + v, 0) / allTercih[alt].length : 0;
      overallGaps[alt] = {
        mevcut: Math.round(mMean * 10) / 10,
        tercih: Math.round(tMean * 10) / 10,
        gap: Math.round((tMean - mMean) * 10) / 10,
      };
    }

    // Gap severity classification
    const gaps = Object.entries(overallGaps).map(([alt, data]) => ({
      culture: alt,
      cultureName: CULTURE_LABELS[alt],
      ...data,
      severity: Math.abs(data.gap) < 5 ? 'low' : Math.abs(data.gap) < 10 ? 'medium' : 'high',
    }));

    reply.send({
      success: true,
      data: {
        responseCount: ocaiResponses.length,
        gaps,
        dimensions,
      },
    });
  });

  // ══════════════════════════════════════════
  // GET /analytics/departments/:campaignId — Birim Bazlı Karşılaştırma
  // ══════════════════════════════════════════
  app.get('/departments/:campaignId', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { org: string };
    const { campaignId } = request.params as { campaignId: string };
    const { module: moduleCode } = request.query as { module?: string };

    const campaign = await prisma.surveyCampaign.findFirst({
      where: { id: campaignId, orgId: org },
    });

    if (!campaign) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Kampanya bulunamadı' } });

    // Yanıtları ve kullanıcı bilgisini al (department bazlı)
    const responses = await prisma.surveyResponse.findMany({
      where: { campaignId, status: 'COMPLETED' },
      include: {
        answers: moduleCode ? { where: { moduleCode } } : true,
      },
    });

    // Demografik bilgideki departman alanını kullan
    const deptScores: Record<string, { values: number[]; count: number }> = {};

    for (const resp of responses) {
      const demo = resp.demographicJson as any;
      const dept = demo?.department || 'Belirtilmemiş';

      if (!deptScores[dept]) deptScores[dept] = { values: [], count: 0 };
      deptScores[dept].count++;

      for (const answer of resp.answers) {
        const data = answer.answerJson as any;
        if (data.value !== undefined) {
          deptScores[dept].values.push(data.value);
        }
      }
    }

    // Min 5 kişi kuralı
    const departments = Object.entries(deptScores)
      .filter(([, data]) => data.count >= 5)
      .map(([dept, data]) => ({
        department: dept,
        participantCount: data.count,
        mean: data.values.length > 0
          ? Math.round((data.values.reduce((s, v) => s + v, 0) / data.values.length) * 100) / 100
          : 0,
        answerCount: data.values.length,
      }))
      .sort((a, b) => b.mean - a.mean);

    const excludedCount = Object.values(deptScores).filter((d) => d.count < 5).length;

    reply.send({
      success: true,
      data: {
        departments,
        excludedDepartments: excludedCount,
        totalParticipants: responses.length,
      },
    });
  });

  // ══════════════════════════════════════════
  // GET /analytics/descriptive/:campaignId/:moduleCode — Betimsel İstatistik
  // ══════════════════════════════════════════
  app.get('/descriptive/:campaignId/:moduleCode', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { org: string };
    const { campaignId, moduleCode } = request.params as { campaignId: string; moduleCode: string };

    const campaign = await prisma.surveyCampaign.findFirst({
      where: { id: campaignId, orgId: org },
    });

    if (!campaign) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Kampanya bulunamadı' } });

    const responses = await prisma.surveyResponse.findMany({
      where: { campaignId, status: 'COMPLETED' },
      include: { answers: { where: { moduleCode } } },
    });

    const respondents = responses.filter((r) => r.answers.length > 0);
    if (respondents.length === 0) {
      return reply.send({ success: true, data: { responseCount: 0, subdimensions: [] } });
    }

    // Alt boyut bazlı değerler topla
    const modules = questionBank.modules as Record<string, any>;
    const mod = modules[moduleCode];
    const subdimValues: Record<string, { values: number[]; title: string }> = {};

    for (const resp of respondents) {
      for (const answer of resp.answers) {
        const data = answer.answerJson as { subdimension: string; value: number };
        if (!data.subdimension || data.value === undefined) continue;

        if (!subdimValues[data.subdimension]) {
          const sub = mod?.subdimensions?.find((s: any) => s.id === data.subdimension);
          subdimValues[data.subdimension] = { values: [], title: sub?.title || data.subdimension };
        }
        subdimValues[data.subdimension].values.push(data.value);
      }
    }

    // İstatistik hesapla
    function calcStats(values: number[]) {
      const n = values.length;
      if (n === 0) return { mean: 0, std: 0, median: 0, skewness: 0, kurtosis: 0, min: 0, max: 0, n: 0 };

      const sorted = [...values].sort((a, b) => a - b);
      const mean = values.reduce((s, v) => s + v, 0) / n;
      const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
      const std = Math.sqrt(variance);
      const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

      // Çarpıklık (skewness)
      let skewness = 0;
      if (std > 0 && n >= 3) {
        const m3 = values.reduce((s, v) => s + Math.pow(v - mean, 3), 0) / n;
        skewness = m3 / Math.pow(std, 3);
      }

      // Basıklık (kurtosis) - excess kurtosis
      let kurtosis = 0;
      if (std > 0 && n >= 4) {
        const m4 = values.reduce((s, v) => s + Math.pow(v - mean, 4), 0) / n;
        kurtosis = (m4 / Math.pow(std, 4)) - 3;
      }

      return {
        mean: Math.round(mean * 100) / 100,
        std: Math.round(std * 100) / 100,
        median: Math.round(median * 100) / 100,
        skewness: Math.round(skewness * 1000) / 1000,
        kurtosis: Math.round(kurtosis * 1000) / 1000,
        min: Math.min(...values),
        max: Math.max(...values),
        n,
      };
    }

    // Cronbach alfa hesapla
    function cronbachAlpha(itemValues: number[][]) {
      const k = itemValues.length;
      if (k < 2) return 0;

      const n = itemValues[0].length;
      if (n < 2) return 0;

      // Item varyansları
      const itemVariances = itemValues.map((vals) => {
        const mean = vals.reduce((s, v) => s + v, 0) / n;
        return vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
      });
      const sumItemVar = itemVariances.reduce((s, v) => s + v, 0);

      // Toplam skor varyansı
      const totalScores: number[] = [];
      for (let i = 0; i < n; i++) {
        totalScores.push(itemValues.reduce((s, vals) => s + vals[i], 0));
      }
      const totalMean = totalScores.reduce((s, v) => s + v, 0) / n;
      const totalVar = totalScores.reduce((s, v) => s + Math.pow(v - totalMean, 2), 0) / n;

      if (totalVar === 0) return 0;
      const alpha = (k / (k - 1)) * (1 - sumItemVar / totalVar);
      return Math.round(alpha * 1000) / 1000;
    }

    const subdimensions = Object.entries(subdimValues).map(([id, { values, title }]) => {
      const stats = calcStats(values);

      // Yanıt dağılımı histogramı
      const scaleMax = moduleCode === 'M4_UWES' ? 7 : 5;
      const distribution: Record<number, number> = {};
      for (let i = (moduleCode === 'M4_UWES' ? 0 : 1); i <= scaleMax; i++) {
        distribution[i] = values.filter((v) => v === i).length;
      }

      return { id, title, ...stats, distribution };
    });

    // Genel istatistikler
    const allValues = Object.values(subdimValues).flatMap((s) => s.values);
    const overallStats = calcStats(allValues);

    // Cronbach alfa (tüm maddelerin değerlerini item bazında grupla)
    // Her madde (soru) için bir değer dizisi oluştur — respondent bazında
    const itemGroups: Record<string, number[]> = {};
    for (const resp of respondents) {
      for (const answer of resp.answers) {
        const data = answer.answerJson as { subdimension: string; value: number; questionId?: string };
        const key = data.questionId || data.subdimension || 'unknown';
        if (!itemGroups[key]) itemGroups[key] = [];
        itemGroups[key].push(data.value);
      }
    }

    // Sadece eşit uzunlukta olanlar
    const maxLen = Math.max(...Object.values(itemGroups).map((v) => v.length));
    const validItems = Object.values(itemGroups).filter((v) => v.length === maxLen);
    const alpha = validItems.length >= 2 ? cronbachAlpha(validItems) : null;

    reply.send({
      success: true,
      data: {
        moduleCode,
        responseCount: respondents.length,
        overallStats,
        cronbachAlpha: alpha,
        subdimensions,
      },
    });
  });

  // ══════════════════════════════════════════
  // GET /analytics/stakeholders/:campaignId — Paydaş Grubu Karşılaştırma
  // ══════════════════════════════════════════
  app.get('/stakeholders/:campaignId', { preHandler: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { org } = request.user as { org: string };
    const { campaignId } = request.params as { campaignId: string };
    const { module: moduleCode } = request.query as { module?: string };

    const campaign = await prisma.surveyCampaign.findFirst({
      where: { id: campaignId, orgId: org },
    });

    if (!campaign) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Kampanya bulunamadı' } });

    const responses = await prisma.surveyResponse.findMany({
      where: { campaignId, status: 'COMPLETED' },
      include: {
        answers: moduleCode ? { where: { moduleCode } } : true,
      },
    });

    const STAKEHOLDER_LABELS: Record<string, string> = {
      academic: 'Akademik',
      administrative: 'İdari',
      student: 'Öğrenci',
      management: 'Yönetim',
      external: 'Dış Paydaş',
    };

    const stakeholderScores: Record<string, { values: number[]; count: number }> = {};

    for (const resp of responses) {
      const demo = resp.demographicJson as any;
      const group = demo?.stakeholderGroup || 'other';

      if (!stakeholderScores[group]) stakeholderScores[group] = { values: [], count: 0 };
      stakeholderScores[group].count++;

      for (const answer of resp.answers) {
        const data = answer.answerJson as any;
        if (data.value !== undefined) {
          stakeholderScores[group].values.push(data.value);
        }
      }
    }

    const stakeholders = Object.entries(stakeholderScores)
      .filter(([, data]) => data.count >= 3)
      .map(([group, data]) => ({
        group,
        groupName: STAKEHOLDER_LABELS[group] || group,
        participantCount: data.count,
        mean: data.values.length > 0
          ? Math.round((data.values.reduce((s, v) => s + v, 0) / data.values.length) * 100) / 100
          : 0,
        answerCount: data.values.length,
      }))
      .sort((a, b) => b.mean - a.mean);

    reply.send({
      success: true,
      data: {
        stakeholders,
        totalParticipants: responses.length,
      },
    });
  });
}
