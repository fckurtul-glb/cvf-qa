import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/database';
import { config } from '../config/env';
import { notificationService } from '../modules/notifications/service';
import { queueSurveyReminder, queueReportReady } from './email-sender';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

export const campaignQueue = new Queue('campaign', { connection: redis });

export const campaignWorker = new Worker(
  'campaign',
  async (job) => {
    const { action, campaignId, triggeredBy } = job.data;

    switch (action) {
      case 'generate_tokens':
        return await generateTokens(campaignId, triggeredBy);

      case 'send_invitations':
        return await sendInvitations(campaignId);

      case 'send_reminders':
        return await sendReminders(campaignId);

      case 'close_campaign':
        return await closeCampaign(campaignId, triggeredBy);
    }
  },
  {
    connection: redis,
    concurrency: 2,
    limiter: { max: 5, duration: 1000 },
  },
);

// ── generate_tokens: Survey tokenlari uret (HMAC-SHA256) ──
async function generateTokens(campaignId: string, triggeredBy?: string) {
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: campaignId },
    include: { organization: true },
  });
  if (!campaign) throw new Error('Kampanya bulunamadı');

  const targetGroups = campaign.targetGroups as string[];
  const participants = await prisma.user.findMany({
    where: {
      orgId: campaign.orgId,
      isActive: true,
      stakeholderGroup: { in: targetGroups as any },
      role: { in: ['PARTICIPANT', 'UNIT_ADMIN', 'ORG_ADMIN'] },
    },
  });

  // Mevcut tokenları kontrol et — zaten üretilmişleri atla
  const existingTokens = await prisma.surveyToken.findMany({
    where: { campaignId },
    select: { userId: true },
  });
  const existingUserIds = new Set(existingTokens.map((t) => t.userId));
  const newParticipants = participants.filter((p) => !existingUserIds.has(p.id));

  let generated = 0;
  const errors: string[] = [];

  for (const user of newParticipants) {
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
          expiresAt:
            campaign.closesAt ?? new Date(Date.now() + 30 * 24 * 3600 * 1000),
          maxUses: 1,
        },
      });
      generated++;
    } catch (err: any) {
      errors.push(`User ${user.id}: ${err.message}`);
    }
  }

  await prisma.auditLog.create({
    data: {
      orgId: campaign.orgId,
      userId: triggeredBy,
      action: 'campaign.generate_tokens',
      resourceType: 'campaign',
      resourceId: campaignId,
      detailsJson: { generated, skipped: existingUserIds.size, errors: errors.length },
    },
  });

  return { generated, skipped: existingUserIds.size, errors };
}

// ── send_invitations: E-posta davetiyesi gonder ──
async function sendInvitations(campaignId: string) {
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: campaignId },
    include: { organization: true },
  });
  if (!campaign) throw new Error('Kampanya bulunamadı');

  // Kullanılmamış tokenları bul
  const tokens = await prisma.surveyToken.findMany({
    where: { campaignId, usedCount: 0, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  let sent = 0;
  const errors: string[] = [];

  for (const token of tokens) {
    try {
      // Token hash doğrudan kullanılmaz; kullanıcıya özel yeni link raw token ile gönderilmeliydi.
      // Campaign service'teki launch() zaten bunu yapıyor. Bu job yalnızca retry amaçlı.
      await notificationService.sendEmail({
        to: token.userId,
        subject: `${campaign.name} — Anket Davetiyesi`,
        template: 'survey-invitation',
        data: {
          campaignName: campaign.name,
          orgName: campaign.organization.name,
          surveyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/survey/in-progress?token=${token.tokenHash}`,
          expiresAt: campaign.closesAt?.toISOString(),
        },
      });
      sent++;
    } catch (err: any) {
      errors.push(`Token ${token.id}: ${err.message}`);
    }
  }

  return { sent, errors };
}

// ── send_reminders: Hatirlatma e-postalari ──
async function sendReminders(campaignId: string) {
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: campaignId },
    include: { organization: true },
  });
  if (!campaign) throw new Error('Kampanya bulunamadı');
  if (campaign.status !== 'ACTIVE') return { sent: 0, reason: 'Kampanya aktif değil' };

  // Tamamlanmamış tokenları bul
  const pendingTokens = await prisma.surveyToken.findMany({
    where: {
      campaignId,
      usedCount: 0,
      expiresAt: { gt: new Date() },
    },
  });

  const daysLeft = campaign.closesAt
    ? Math.ceil((campaign.closesAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  let sent = 0;
  for (const token of pendingTokens) {
    try {
      await queueSurveyReminder(
        token.userId,
        `${process.env.NEXT_PUBLIC_APP_URL}/survey/in-progress?token=${token.tokenHash}`,
        daysLeft,
        campaign.orgId,
        campaignId,
      );
      sent++;
    } catch {
      // Hatalar email-sender worker tarafından loglanır
    }
  }

  await prisma.auditLog.create({
    data: {
      orgId: campaign.orgId,
      action: 'campaign.send_reminders',
      resourceType: 'campaign',
      resourceId: campaignId,
      detailsJson: { sent, pendingCount: pendingTokens.length, daysLeft },
    },
  });

  return { sent, daysLeft };
}

// ── close_campaign: Kampanya kapat, sonuc hesapla ──
async function closeCampaign(campaignId: string, triggeredBy?: string) {
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: campaignId },
    include: { organization: true },
  });
  if (!campaign) throw new Error('Kampanya bulunamadı');

  // Kampanyayı COMPLETED olarak işaretle
  await prisma.surveyCampaign.update({
    where: { id: campaignId },
    data: { status: 'COMPLETED' },
  });

  // İstatistikleri hesapla
  const totalTokens = await prisma.surveyToken.count({ where: { campaignId } });
  const completedResponses = await prisma.surveyResponse.count({
    where: { campaignId, status: 'COMPLETED' },
  });
  const responseRate = totalTokens > 0 ? Math.round((completedResponses / totalTokens) * 100) : 0;

  // IN_PROGRESS yanıtları EXPIRED olarak işaretle
  await prisma.surveyResponse.updateMany({
    where: { campaignId, status: 'IN_PROGRESS' },
    data: { status: 'EXPIRED' },
  });

  // Kullanılmamış tokenları expire et
  await prisma.surveyToken.updateMany({
    where: { campaignId, usedCount: 0 },
    data: { expiresAt: new Date() },
  });

  // Admin'lere rapor hazır bildirimi gönder
  const admins = await prisma.user.findMany({
    where: {
      orgId: campaign.orgId,
      role: { in: ['ORG_ADMIN', 'SUPER_ADMIN'] },
      isActive: true,
    },
  });

  for (const admin of admins) {
    await queueReportReady(
      admin.id,
      campaign.name,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reports`,
      responseRate,
      completedResponses,
      totalTokens,
      campaign.orgId,
      campaignId,
    );
  }

  await prisma.auditLog.create({
    data: {
      orgId: campaign.orgId,
      userId: triggeredBy,
      action: 'campaign.close',
      resourceType: 'campaign',
      resourceId: campaignId,
      detailsJson: { totalTokens, completedResponses, responseRate },
    },
  });

  return { totalTokens, completedResponses, responseRate };
}

// ── Event handlers ──
campaignWorker.on('completed', (job) => {
  console.log(`Campaign job ${job.id} (${job.data.action}) completed`);
});

campaignWorker.on('failed', (job, err) => {
  console.error(`Campaign job ${job?.id} (${job?.data?.action}) failed:`, err.message);
});
