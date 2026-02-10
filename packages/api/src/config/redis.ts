import Redis from 'ioredis';
import { config } from './env';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('error', (err) => console.error('Redis connection error:', err));
redis.on('connect', () => console.log('Redis connected'));
