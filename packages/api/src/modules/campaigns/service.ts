import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { config } from '../../config/env';
import { emailQueue } from '../../jobs/email-sender';
import { ANONYMITY, TIER_CAPABILITY_DEFAULTS } from '@cvf-qa/shared';
import type { CampaignStatus, StakeholderGroup, ModuleCode, OrgCapabilities, PackageTier } from '@cvf-qa/shared';

interface CreateCampaignInput {
  orgId: string;
  name: string;
  description?: string;
  modules: string[];
  targetGroups: string[];
  closesAt: Date;
  createdBy: string;
  reminderConfig?: { enabled: boolean; intervalDays: number; maxReminders: number; channels: string[] };
}

interface LaunchResult {
  success: boolean;
  tokensGenerated: number;
  emailsSent: number;
  errors: string[];
}

export function resolveCapabilities(org: { packageTier: string; settings: any }): OrgCapabilities {
  const tier = org.packageTier.toLowerCase() as PackageTier;
  const defaults = TIER_CAPABILITY_DEFAULTS[tier] ?? TIER_CAPABILITY_DEFAULTS.starter;
  const overrides = (org.settings as any)?.capabilities ?? {};

  return {
    allowedModules: overrides.allowedModules ?? defaults.allowedModules,
    features: { ...defaults.features, ...(overrides.features ?? {}) },
    allowedReports: overrides.allowedReports ?? defaults.allowedReports,
    limits: { ...defaults.limits, ...(overrides.limits ?? {}) },
  };
}

class CampaignService {
  // ── Kampanya Oluşturma ──
  async create(input: CreateCampaignInput) {
    // Paket tier kontrolü: Kurum sadece izin verilen modülleri kullanabilir
    const org = await prisma.organization.findUnique({ where: { id: input.orgId } });
    if (!org) throw new Error('Kurum bulunamadı');
    if (!org.isActive) throw new Error('Kurum hesabı devre dışı');

    const capabilities = resolveCapabilities(org);
    const unauthorized = input.modules.filter((m) => !capabilities.allowedModules.includes(m as ModuleCode));
    if (unauthorized.length > 0) {
      throw new Error(`Bu modüller paketinizde yok: ${unauthorized.join(', ')}`);
    }

    // maxCampaigns limit kontrolü
    if (capabilities.limits.maxCampaigns !== -1) {
      const activeCampaignCount = await prisma.surveyCampaign.count({
        where: { orgId: input.orgId, status: { notIn: ['ARCHIVED', 'COMPLETED'] } },
      });
      if (activeCampaignCount >= capabilities.limits.maxCampaigns) {
        throw new Error(`Aktif kampanya limiti (${capabilities.limits.maxCampaigns}) aşıldı`);
      }
    }

    const campaign = await prisma.surveyCampaign.create({
      data: {
        orgId: input.orgId,
        name: input.name,
        description: input.description,
        status: 'DRAFT',
        moduleConfigJson: input.modules,
        targetGroups: input.targetGroups,
        closesAt: input.closesAt,
        createdBy: input.createdBy,
        reminderConfig: input.reminderConfig ?? { enabled: true, intervalDays: 3, maxReminders: 3, channels: ['email'] },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.createdBy,
        action: 'campaign.create',
        resourceType: 'campaign',
        resourceId: campaign.id,
        detailsJson: { modules: input.modules, targetGroups: input.targetGroups },
      },
    });

    return campaign;
  }

  // ── Kampanya Başlatma (Token Üretimi + E-posta Dağıtımı) ──
  async launch(campaignId: string, launchedBy: string): Promise<LaunchResult> {
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: campaignId },
      include: { organization: true },
    });

    if (!campaign) throw new Error('Kampanya bulunamadı');
    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      throw new Error(`Kampanya '${campaign.status}' durumunda, başlatılamaz`);
    }

    // Hedef katılımcıları bul
    const targetGroups = campaign.targetGroups as string[];
    const participants = await prisma.user.findMany({
      where: {
        orgId: campaign.orgId,
        isActive: true,
        stakeholderGroup: { in: targetGroups as any },
        role: { in: ['PARTICIPANT', 'UNIT_ADMIN', 'ORG_ADMIN'] },
      },
    });

    // Katılımcı limit kontrolü — resolveCapabilities kullan
    const capabilities = resolveCapabilities(campaign.organization);
    const maxParticipants = capabilities.limits.maxParticipantsPerCampaign;
    if (participants.length > maxParticipants) {
      throw new Error(`Katılımcı sayısı (${participants.length}) paket limitini (${maxParticipants}) aşıyor`);
    }

    const errors: string[] = [];
    let tokensGenerated = 0;
    let emailsSent = 0;

    // Her katılımcı için benzersiz token üret
    for (const user of participants) {
      try {
        const rawToken = nanoid(48);
        const tokenHash = crypto
          .createHmac('sha256', config.ENCRYPTION_KEY)
          .update(rawToken)
          .digest('hex');

        await prisma.surveyToken.create({
          data: {
            campaignId,
            userId: user.id,
            tokenHash,
            moduleSet: campaign.moduleConfigJson as any,
            expiresAt: campaign.closesAt ?? new Date(Date.now() + ANONYMITY.TOKEN_EXPIRY_HOURS * 3600 * 1000),
            maxUses: 1,
          },
        });
        tokensGenerated++;

        // E-posta kuyruğuna ekle (BullMQ) — orgId dahil
        await emailQueue.add('survey-invitation', {
          to: user.id, // Email, auth service'de decrypt edilecek
          subject: `${campaign.name} — Anket Davetiyesi`,
          template: 'survey-invitation',
          data: {
            campaignName: campaign.name,
            orgName: campaign.organization.name,
            surveyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/survey/start?t=${rawToken}`,
            expiresAt: campaign.closesAt?.toISOString(),
          },
          orgId: campaign.orgId,
          campaignId: campaign.id,
        });
        emailsSent++;
      } catch (err: any) {
        errors.push(`User ${user.id}: ${err.message}`);
      }
    }

    // Kampanya durumunu güncelle
    await prisma.surveyCampaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        orgId: campaign.orgId,
        userId: launchedBy,
        action: 'campaign.launch',
        resourceType: 'campaign',
        resourceId: campaignId,
        detailsJson: { tokensGenerated, emailsSent, participantCount: participants.length },
      },
    });

    return { success: true, tokensGenerated, emailsSent, errors };
  }

  // ── Kampanya Durumu (Dashboard için) ──
  async getStatus(campaignId: string) {
    const campaign = await prisma.surveyCampaign.findUnique({
      where: { id: campaignId },
      include: { _count: { select: { tokens: true, responses: true } } },
    });
    if (!campaign) throw new Error('Kampanya bulunamadı');

    const responses = await prisma.surveyResponse.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: true,
    });

    const statusMap = Object.fromEntries(responses.map((r) => [r.status, r._count]));
    const totalInvited = campaign._count.tokens;
    const totalCompleted = statusMap['COMPLETED'] ?? 0;
    const totalInProgress = statusMap['IN_PROGRESS'] ?? 0;

    return {
      campaign: { id: campaign.id, name: campaign.name, status: campaign.status, startedAt: campaign.startedAt, closesAt: campaign.closesAt },
      stats: {
        totalInvited,
        totalStarted: totalInProgress + totalCompleted,
        totalCompleted,
        responseRate: totalInvited > 0 ? Math.round((totalCompleted / totalInvited) * 100) : 0,
      },
    };
  }

  // ── Hatırlatma Gönder ──
  async sendReminders(campaignId: string) {
    const pending = await prisma.surveyToken.findMany({
      where: { campaignId, usedCount: 0, expiresAt: { gt: new Date() } },
      include: { user: true, campaign: true },
    });

    let sent = 0;
    for (const token of pending) {
      await emailQueue.add('survey-reminder', {
        to: token.userId,
        subject: 'Anket Hatırlatması',
        template: 'survey-reminder',
        data: { surveyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/survey/start?t=${token.tokenHash}` },
        orgId: token.campaign.orgId,
        campaignId: token.campaignId,
      });
      sent++;
    }
    return { remindersSent: sent };
  }
}

export const campaignService = new CampaignService();
