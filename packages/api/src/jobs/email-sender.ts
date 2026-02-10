import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';

export const emailQueue = new Queue('email', { connection: redis });

export const emailWorker = new Worker('email', async (job) => {
  const { to, subject, template, data } = job.data;
  // TODO: Resend API entegrasyonu
  console.log(`Sending email to ${to}: ${subject}`);
}, { connection: redis, concurrency: 5 });
