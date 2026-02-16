import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

// Monorepo root: packages/api/../../ = root
const rootDir = resolve(__dirname, '..', '..', '..', '..');
const pkgDir = resolve(__dirname, '..', '..');

// Önce paket dizini, sonra monorepo root — ilk bulunan kazanır
dotenvConfig({ path: resolve(pkgDir, '.env.local') });
dotenvConfig({ path: resolve(pkgDir, '.env') });
dotenvConfig({ path: resolve(rootDir, '.env.local') });
dotenvConfig({ path: resolve(rootDir, '.env') });

const isProduction = process.env.NODE_ENV === 'production';

// Production'da hardcoded dev key'ler kabul edilmez
const DEV_DEFAULTS = ['dev-otp-secret-key-16', 'dev-magic-link-secret'];

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  OTP_SECRET_KEY: z.string().min(16).default('dev-otp-secret-key-16'),
  MAGIC_LINK_SECRET: z.string().min(16).default('dev-magic-link-secret'),

  ENCRYPTION_KEY: z.string().min(32),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@cvf-qa.com.tr'),

  NETGSM_USERCODE: z.string().optional(),
  NETGSM_PASSWORD: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-20250514'),

  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET_REPORTS: z.string().default('cvfqa-reports'),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

// Production güvenlik kontrolü: hardcoded dev key'ler varsa hata fırlat
if (isProduction) {
  const errors: string[] = [];

  if (DEV_DEFAULTS.includes(parsed.OTP_SECRET_KEY)) {
    errors.push('OTP_SECRET_KEY production ortamında hardcoded dev değeri kullanılamaz');
  }
  if (DEV_DEFAULTS.includes(parsed.MAGIC_LINK_SECRET)) {
    errors.push('MAGIC_LINK_SECRET production ortamında hardcoded dev değeri kullanılamaz');
  }
  if (parsed.CORS_ORIGINS === 'http://localhost:3000') {
    errors.push('CORS_ORIGINS production ortamında localhost olamaz');
  }
  if (!parsed.RESEND_API_KEY) {
    errors.push('RESEND_API_KEY production ortamında zorunludur');
  }

  if (errors.length > 0) {
    throw new Error(
      `Production ortam değişkeni hataları:\n${errors.map((e) => `  - ${e}`).join('\n')}`,
    );
  }
}

export const config = parsed;
export type Config = z.infer<typeof envSchema>;
