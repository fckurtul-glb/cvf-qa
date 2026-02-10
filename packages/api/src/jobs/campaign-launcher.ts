import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';

export const campaignQueue = new Queue('campaign', { connection: redis });

export const campaignWorker = new Worker('campaign', async (job) => {
  const { campaignId, action } = job.data;
  switch (action) {
    case 'generate_tokens': /* TODO: Bulk token üretimi */ break;
    case 'send_invitations': /* TODO: E-posta dağıtımı */ break;
    case 'send_reminders': /* TODO: Hatırlatma gönderimi */ break;
    case 'close_campaign': /* TODO: Kampanya kapatma */ break;
  }
}, { connection: redis, concurrency: 2 });
