// Frontend ortam değişkenleri validasyonu
// Next.js build sırasında NEXT_PUBLIC_ prefix'li değişkenler client bundle'a dahil edilir

const requiredEnvVars = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
} as const;

const optionalEnvVars = {
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
} as const;

// Build-time validation
const missing = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length > 0 && process.env.NODE_ENV === 'production') {
  throw new Error(
    `Eksik ortam değişkenleri:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\n` +
      `.env.local dosyanıza bu değişkenleri ekleyin.`,
  );
}

export const env = {
  apiUrl: requiredEnvVars.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  appUrl: requiredEnvVars.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  sentryDsn: optionalEnvVars.NEXT_PUBLIC_SENTRY_DSN,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;
