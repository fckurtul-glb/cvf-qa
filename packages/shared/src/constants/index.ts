// ═══ packages/shared/src/constants/index.ts ═══

export const RATE_LIMITS = {
  AUTH_LOGIN: { window: 60_000, max: 5 },
  AUTH_MAGIC_LINK: { window: 60_000, max: 3 },
  AUTH_OTP: { window: 60_000, max: 5 },
  AUTH_REFRESH: { window: 60_000, max: 10 },
  SURVEY_SAVE: { window: 60_000, max: 120 },
  SURVEY_SUBMIT: { window: 60_000, max: 5 },
  REPORT_DOWNLOAD: { window: 60_000, max: 10 },
  DASHBOARD: { window: 60_000, max: 60 },
  CSV_IMPORT: { window: 60_000, max: 5 },
} as const;

export const ANONYMITY = {
  MIN_GROUP_SIZE: 5, // Birim raporu için min. 5 yanıt
  HASH_ALGORITHM: 'sha256',
  TOKEN_EXPIRY_HOURS: 72,
  MAGIC_LINK_EXPIRY_MINUTES: 30,
  OTP_EXPIRY_MINUTES: 5,
  BRUTE_FORCE_LOCKOUT_MINUTES: 15,
  BRUTE_FORCE_MAX_ATTEMPTS: 5,
} as const;

export const SURVEY = {
  IPSATIVE_SUM: 100,
  AUTO_SAVE_INTERVAL_MS: 30_000,
  SESSION_TIMEOUT_MINUTES: 60,
  MAX_COMPLETION_HOURS: 168, // 7 gün
} as const;

export const YOKAK_CRITERIA = {
  'A.1': 'Yönetim ve Kalite',
  'A.1.4': 'İç Kalite Güvencesi Mekanizmaları',
  'A.2.1': 'Misyon, Vizyon ve Politikalar',
  'A.2.3': 'Performans Yönetimi',
  'A.3': 'Kalite Güvencesi',
  'A.3.1': 'Bilgi Yönetim Sistemi',
  'A.3.4': 'Süreç Yönetimi',
  'A.4': 'Paydaş Katılımı',
  'A.4.1': 'İç ve Dış Paydaş Katılımı',
  'A.5': 'İnsan Kaynakları Yönetimi',
  'A.6': 'Stratejik Planlama',
} as const;

export const ENCRYPTION = {
  ALGORITHM: 'aes-256-cbc',
  PASSWORD_HASH: 'argon2id',
  TOKEN_HASH: 'hmac-sha256',
} as const;
