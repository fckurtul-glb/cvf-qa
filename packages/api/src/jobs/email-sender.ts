import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';
import { notificationService } from '../modules/notifications/service';

export const emailQueue = new Queue('email', { connection: redis });

export const emailWorker = new Worker('email', async (job) => {
  const { to, subject, template, data } = job.data;

  const result = await notificationService.sendEmail({ to, subject, template, data });

  if (!result.success) {
    console.error(`Email failed [${job.id}]: ${result.error}`);
    throw new Error(result.error);
  }

  console.log(`Email sent [${job.id}] to ${to}: ${subject} (${result.messageId})`);
  return result;
}, {
  connection: redis,
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
) {
  return emailQueue.add('survey-invitation', {
    to,
    subject: `${campaignName} — Anket Davetiyesi`,
    template: 'survey-invitation',
    data: { orgName, campaignName, surveyUrl, expiresAt: expiresAt?.toISOString() },
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
) {
  return emailQueue.add('survey-reminder', {
    to,
    subject: `Hatırlatma: Anketinizi tamamlamayı unutmayın (${daysLeft} gün kaldı)`,
    template: 'survey-reminder',
    data: { surveyUrl, daysLeft },
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
) {
  return emailQueue.add('360-invitation', {
    to,
    subject: `360° Değerlendirme Davetiyesi — ${managerName}`,
    template: '360-invitation',
    data: { managerName, orgName, campaignName, surveyUrl, perspective, expiresAt: expiresAt?.toISOString() },
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
) {
  return emailQueue.add('report-ready', {
    to,
    subject: `Rapor Hazır: ${campaignName}`,
    template: 'report-ready',
    data: { campaignName, reportUrl, responseRate, completedCount, totalCount },
  }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}
