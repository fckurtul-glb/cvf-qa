import { prisma } from '../../config/database';
import { config } from '../../config/env';
import { decrypt } from '../../utils/encryption';
import { redis } from '../../config/redis';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import questionBank from '../../data/question-bank.json';

const MSAI = (questionBank.modules as any).M3_MSAI;

class Assessment360Service {
  // ── 360° Konfigürasyon Oluştur ──
  async createConfig(campaignId: string, managerId: string, orgId: string, createdBy: string) {
    // Kampanya kontrolü
    const campaign = await prisma.surveyCampaign.findFirst({
      where: { id: campaignId, orgId },
    });
    if (!campaign) return { success: false, error: 'Kampanya bulunamadı' };

    // Manager kontrolü
    const manager = await prisma.user.findFirst({
      where: { id: managerId, orgId, isActive: true },
    });
    if (!manager) return { success: false, error: 'Yönetici bulunamadı' };

    // Aynı kampanyada aynı yönetici için tekrar oluşturma
    const existing = await prisma.assessment360Config.findUnique({
      where: { campaignId_managerId: { campaignId, managerId } },
    });
    if (existing) return { success: false, error: 'Bu yönetici için zaten bir 360° değerlendirme var' };

    const config360 = await prisma.assessment360Config.create({
      data: { campaignId, managerId },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId,
        userId: createdBy,
        action: 'assessment360.create',
        resourceType: 'assessment360_config',
        resourceId: config360.id,
        detailsJson: { campaignId, managerId },
      },
    });

    return { success: true, data: config360 };
  }

  // ── Değerlendirici Ata ──
  async assignRaters(
    configId: string,
    orgId: string,
    raters: { userId: string; perspective: 'SELF' | 'SUBORDINATE' | 'PEER' | 'SUPERIOR' }[],
  ) {
    const config360 = await prisma.assessment360Config.findUnique({
      where: { id: configId },
      include: { campaign: true },
    });
    if (!config360) return { success: false, error: 'Konfigürasyon bulunamadı' };
    if (config360.campaign.orgId !== orgId) return { success: false, error: 'Yetki yok' };

    const created = [];
    for (const rater of raters) {
      // Kullanıcı kontrolü
      const user = await prisma.user.findFirst({
        where: { id: rater.userId, orgId, isActive: true },
      });
      if (!user) continue;

      // Zaten atanmış mı?
      const existing = await prisma.assessment360Rater.findUnique({
        where: { configId_raterUserId: { configId, raterUserId: rater.userId } },
      });
      if (existing) continue;

      const raterRecord = await prisma.assessment360Rater.create({
        data: {
          configId,
          raterUserId: rater.userId,
          perspective: rater.perspective,
        },
      });
      created.push(raterRecord);
    }

    return { success: true, data: { assigned: created.length } };
  }

  // ── 360° Başlat (Token Üret + Davet Gönder) ──
  async launch(configId: string, orgId: string, launchedBy: string) {
    const config360 = await prisma.assessment360Config.findUnique({
      where: { id: configId },
      include: {
        campaign: { include: { organization: true } },
        raters: { include: { rater: true } },
        manager: true,
      },
    });
    if (!config360) return { success: false, error: 'Konfigürasyon bulunamadı' };
    if (config360.campaign.orgId !== orgId) return { success: false, error: 'Yetki yok' };
    if (config360.status !== 'PENDING') return { success: false, error: 'Değerlendirme zaten başlatılmış' };
    if (config360.raters.length === 0) return { success: false, error: 'Henüz değerlendirici atanmamış' };

    let tokensGenerated = 0;

    for (const rater of config360.raters) {
      // Her değerlendirici için benzersiz token üret
      const rawToken = nanoid(48);
      const tokenHash = crypto
        .createHmac('sha256', config.ENCRYPTION_KEY)
        .update(rawToken)
        .digest('hex');

      const surveyToken = await prisma.surveyToken.create({
        data: {
          campaignId: config360.campaignId,
          userId: rater.raterUserId,
          tokenHash,
          moduleSet: ['M3_MSAI'],
          expiresAt: config360.campaign.closesAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          maxUses: 1,
        },
      });

      // Token ID'yi rater kaydına bağla
      await prisma.assessment360Rater.update({
        where: { id: rater.id },
        data: { tokenId: surveyToken.id },
      });

      tokensGenerated++;
    }

    // Durumu güncelle
    await prisma.assessment360Config.update({
      where: { id: configId },
      data: { status: 'IN_PROGRESS' },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId,
        userId: launchedBy,
        action: 'assessment360.launch',
        resourceType: 'assessment360_config',
        resourceId: configId,
        detailsJson: { tokensGenerated, ratersCount: config360.raters.length },
      },
    });

    return { success: true, data: { tokensGenerated } };
  }

  // ── 360° Listesi ──
  // FIX B: select nameEncrypted/emailEncrypted instead of name/email; decrypt before returning
  async list(orgId: string) {
    const configs = await prisma.assessment360Config.findMany({
      where: { campaign: { orgId } },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: { select: { name: true } },
        manager: { select: { id: true, nameEncrypted: true, emailEncrypted: true } },
        raters: { select: { id: true, perspective: true, status: true } },
      },
    });

    return {
      success: true,
      data: configs.map((c) => ({
        id: c.id,
        campaignName: c.campaign.name,
        managerName:
          (c.manager.nameEncrypted ? decrypt(c.manager.nameEncrypted) : null) ||
          (c.manager.emailEncrypted ? decrypt(c.manager.emailEncrypted) : null),
        managerId: c.manager.id,
        status: c.status,
        createdAt: c.createdAt,
        raterCount: c.raters.length,
        completedCount: c.raters.filter((r) => r.status === 'COMPLETED').length,
      })),
    };
  }

  // ── 360° Detay ──
  // FIX B: select nameEncrypted/emailEncrypted instead of name/email; decrypt before returning
  async getDetail(configId: string, orgId: string) {
    const config360 = await prisma.assessment360Config.findUnique({
      where: { id: configId },
      include: {
        campaign: { select: { name: true, orgId: true } },
        manager: { select: { id: true, nameEncrypted: true, emailEncrypted: true } },
        raters: {
          include: { rater: { select: { id: true, nameEncrypted: true, emailEncrypted: true } } },
        },
      },
    });

    if (!config360) return { success: false, error: 'Konfigürasyon bulunamadı' };
    if (config360.campaign.orgId !== orgId) return { success: false, error: 'Yetki yok' };

    const perspectives = {
      SELF: config360.raters.filter((r) => r.perspective === 'SELF'),
      SUBORDINATE: config360.raters.filter((r) => r.perspective === 'SUBORDINATE'),
      PEER: config360.raters.filter((r) => r.perspective === 'PEER'),
      SUPERIOR: config360.raters.filter((r) => r.perspective === 'SUPERIOR'),
    };

    const managerName =
      (config360.manager.nameEncrypted ? decrypt(config360.manager.nameEncrypted) : null) ||
      (config360.manager.emailEncrypted ? decrypt(config360.manager.emailEncrypted) : null);

    return {
      success: true,
      data: {
        id: config360.id,
        campaignName: config360.campaign.name,
        manager: { id: config360.manager.id, name: managerName },
        status: config360.status,
        createdAt: config360.createdAt,
        completedAt: config360.completedAt,
        perspectives: Object.fromEntries(
          Object.entries(perspectives).map(([key, raters]) => [
            key,
            {
              count: raters.length,
              completed: raters.filter((r) => r.status === 'COMPLETED').length,
              raters: raters.map((r) => ({
                id: r.id,
                name:
                  (r.rater.nameEncrypted ? decrypt(r.rater.nameEncrypted) : null) ||
                  (r.rater.emailEncrypted ? decrypt(r.rater.emailEncrypted) : null),
                status: r.status,
              })),
            },
          ]),
        ),
      },
    };
  }

  // ── 360° Rapor (Perspektif Bazlı Sonuçlar) ──
  // FIX B: select nameEncrypted/emailEncrypted instead of name/email; decrypt before returning
  async getReport(configId: string, orgId: string) {
    const config360 = await prisma.assessment360Config.findUnique({
      where: { id: configId },
      include: {
        campaign: { select: { name: true, orgId: true } },
        manager: { select: { nameEncrypted: true, emailEncrypted: true } },
        raters: {
          where: { status: 'COMPLETED' },
          include: { rater: true },
        },
      },
    });

    if (!config360) return { success: false, error: 'Konfigürasyon bulunamadı' };
    if (config360.campaign.orgId !== orgId) return { success: false, error: 'Yetki yok' };

    // Min 3 değerlendirici tamamlamalı (anonimlik)
    const completedNonSelf = config360.raters.filter((r) => r.perspective !== 'SELF');
    if (completedNonSelf.length < 3) {
      return { success: false, error: 'Anonimlik garantisi için en az 3 değerlendirici tamamlamalıdır' };
    }

    // Her perspektif için yanıtları topla
    const perspectiveScores: Record<string, Record<string, { values: number[]; title: string }>> = {};

    for (const rater of config360.raters) {
      // Token hash ile eşleştir — Redis resume lookup (FIX C)
      if (rater.tokenId) {
        const token = await prisma.surveyToken.findUnique({ where: { id: rater.tokenId } });
        if (!token) continue;

                // Look up responseId stored by recordConsent in Redis (FIX C: no prefix leak)
        const resumeResponseId = await redis.get(`survey:resume:${token.tokenHash}`);
        if (!resumeResponseId) continue;

        const matchingResponse = await prisma.surveyResponse.findUnique({
          where: { id: resumeResponseId },
          include: { answers: { where: { moduleCode: 'M3_MSAI' } } },
        });
        if (!matchingResponse || matchingResponse.status !== 'COMPLETED') continue;


        const perspective = rater.perspective;
        if (!perspectiveScores[perspective]) perspectiveScores[perspective] = {};

        for (const answer of matchingResponse.answers) {
          const data = answer.answerJson as { subdimension: string; value: number };
          if (!data.subdimension || data.value === undefined) continue;

          if (!perspectiveScores[perspective][data.subdimension]) {
            const sub = MSAI.subdimensions?.find((s: any) => s.id === data.subdimension);
            perspectiveScores[perspective][data.subdimension] = {
              values: [],
              title: sub?.title || data.subdimension,
            };
          }
          perspectiveScores[perspective][data.subdimension].values.push(data.value);
        }
      }
    }

    // Ortalama hesapla
    const report: Record<string, { subdimensions: any[]; overallMean: number }> = {};

    for (const [perspective, subdims] of Object.entries(perspectiveScores)) {
      const subs = Object.entries(subdims).map(([id, { values, title }]) => {
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        return { id, title, mean: Math.round(mean * 100) / 100, count: values.length };
      });

      const allVals = Object.values(subdims).flatMap((s) => s.values);
      const overallMean = allVals.length > 0 ? allVals.reduce((s, v) => s + v, 0) / allVals.length : 0;

      report[perspective] = {
        subdimensions: subs,
        overallMean: Math.round(overallMean * 100) / 100,
      };
    }

    // Kör nokta analizi (öz vs diğerleri)
    const blindSpots: { subdimension: string; title: string; selfScore: number; othersScore: number; gap: number }[] = [];

    if (report.SELF) {
      // Diğer perspektiflerin ortalaması
      const otherPerspectives = Object.entries(report).filter(([k]) => k !== 'SELF');
      const otherSubdims: Record<string, number[]> = {};

      for (const [, { subdimensions }] of otherPerspectives) {
        for (const sub of subdimensions) {
          if (!otherSubdims[sub.id]) otherSubdims[sub.id] = [];
          otherSubdims[sub.id].push(sub.mean);
        }
      }

      for (const selfSub of report.SELF.subdimensions) {
        const otherVals = otherSubdims[selfSub.id] || [];
        if (otherVals.length === 0) continue;
        const othersMean = otherVals.reduce((s, v) => s + v, 0) / otherVals.length;
        const gap = Math.round((selfSub.mean - othersMean) * 100) / 100;

        if (Math.abs(gap) >= 0.5) {
          blindSpots.push({
            subdimension: selfSub.id,
            title: selfSub.title,
            selfScore: selfSub.mean,
            othersScore: Math.round(othersMean * 100) / 100,
            gap,
          });
        }
      }

      blindSpots.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
    }

    // Güçlü ve zayıf yönler (diğerleri bazında)
    const otherPerspectives = Object.entries(report).filter(([k]) => k !== 'SELF');
    const combinedScores: Record<string, { values: number[]; title: string }> = {};

    for (const [, { subdimensions }] of otherPerspectives) {
      for (const sub of subdimensions) {
        if (!combinedScores[sub.id]) combinedScores[sub.id] = { values: [], title: sub.title };
        combinedScores[sub.id].values.push(sub.mean);
      }
    }

    const rankedSubdims = Object.entries(combinedScores)
      .map(([id, { values, title }]) => ({
        id,
        title,
        mean: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100,
      }))
      .sort((a, b) => b.mean - a.mean);

    const strengths = rankedSubdims.slice(0, 5);
    const developmentAreas = [...rankedSubdims].sort((a, b) => a.mean - b.mean).slice(0, 5);

    const managerName =
      (config360.manager.nameEncrypted ? decrypt(config360.manager.nameEncrypted) : null) ||
      (config360.manager.emailEncrypted ? decrypt(config360.manager.emailEncrypted) : null);

    return {
      success: true,
      data: {
        configId,
        managerName,
        campaignName: config360.campaign.name,
        perspectives: report,
        blindSpots,
        strengths,
        developmentAreas,
      },
    };
  }
}

export const assessment360Service = new Assessment360Service();
