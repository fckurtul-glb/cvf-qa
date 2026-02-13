import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/env';
import { notificationService } from '../modules/notifications/service';
import { prisma } from '../config/database';

const bullConnection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });

export const emailQueue = new Queue('email', { connection: bullConnection });

export const emailWorker = new Worker('email', async (job) => {
  const { to, subject, template, data, orgId, campaignId } = job.data;

  // Create EmailLog record as QUEUED
  const emailLog = await prisma.emailLog.create({
    data: {
      orgId: orgId ?? null,
      campaignId: campaignId ?? null,
      toAddress: to,
      subject,
      template,
      status: 'QUEUED',
      jobId: job.id ?? null,
    },
  });

  try {
    const result = await notificationService.sendEmail({ to, subject, template, data });

    if (!result.success) {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: 'FAILED', errorMessage: result.error, failedAt: new Date() },
      });
      console.error(`Email failed [${job.id}]: ${result.error}`);
      throw new Error(result.error);
    }

    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: { status: 'SENT', messageId: result.messageId ?? null, sentAt: new Date() },
    });

    console.log(`Email sent [${job.id}] to ${to}: ${subject} (${result.messageId})`);
    return result;
  } catch (err: any) {
    // Only update if not already marked as FAILED above
    if (err.message !== (await prisma.emailLog.findUnique({ where: { id: emailLog.id } }))?.errorMessage) {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: 'FAILED', errorMessage: err.message, failedAt: new Date() },
      }).catch(() => {});
    }
    throw err;
  }
}, {
  connection: bullConnection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000, // Max 10 emails/sec
  },
});

emailWorker.on('completed', (job) => {
  console.log(`Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Email job ${job?.id} failed:`, err.message);
});

// ── Yardımcı fonksiyonlar ──

export async function queueSurveyInvitation(
  to: string,
  orgName: string,
  campaignName: string,
  surveyUrl: string,
  expiresAt?: Date,
  orgId?: string,
  campaignId?: string,
) {
  return emailQueue.add('survey-invitation', {
    to,
    subject: `${campaignName} — Anket Davetiyesi`,
    template: 'survey-invitation',
    data: { orgName, campaignName, surveyUrl, expiresAt: expiresAt?.toISOString() },
    orgId,
    campaignId,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

export async function queueSurveyReminder(
  to: string,
  surveyUrl: string,
  daysLeft: number,
  orgId?: string,
  campaignId?: string,
) {
  return emailQueue.add('survey-reminder', {
    to,
    subject: `Hatırlatma: Anketinizi tamamlamayı unutmayın (${daysLeft} gün kaldı)`,
    template: 'survey-reminder',
    data: { surveyUrl, daysLeft },
    orgId,
    campaignId,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

export async function queue360Invitation(
  to: string,
  managerName: string,
  orgName: string,
  campaignName: string,
  surveyUrl: string,
  perspective: string,
  expiresAt?: Date,
  orgId?: string,
  campaignId?: string,
) {
  return emailQueue.add('360-invitation', {
    to,
    subject: `360° Değerlendirme Davetiyesi — ${managerName}`,
    template: '360-invitation',
    data: { managerName, orgName, campaignName, surveyUrl, perspective, expiresAt: expiresAt?.toISOString() },
    orgId,
    campaignId,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

export async function queueOrgInvitation(
  to: string,
  orgName: string,
  registerUrl: string,
  role: string,
  expiresAt: Date,
  orgId?: string,
) {
  return emailQueue.add('org-invitation', {
    to,
    subject: `${orgName} — Kurum Yönetici Davetiyesi`,
    template: 'org-invitation',
    data: { orgName, registerUrl, role, expiresAt: expiresAt.toISOString() },
    orgId,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

export async function queueReportReady(
  to: string,
  campaignName: string,
  reportUrl: string,
  responseRate: number,
  completedCount: number,
  totalCount: number,
  orgId?: string,
  campaignId?: string,
) {
  return emailQueue.add('report-ready', {
    to,
    subject: `Rapor Hazır: ${campaignName}`,
    template: 'report-ready',
    data: { campaignName, reportUrl, responseRate, completedCount, totalCount },
    orgId,
    campaignId,
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}
