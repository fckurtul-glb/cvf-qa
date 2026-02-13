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

import type { OrgCapabilities, PackageTier } from '../types/organization';

export const TIER_CAPABILITY_DEFAULTS: Record<PackageTier, OrgCapabilities> = {
  starter: {
    allowedModules: ['M1_OCAI', 'M2_QCI', 'M4_UWES'],
    features: {
      assessment360: false,
      gapAnalysis: true,
      descriptiveAnalytics: true,
      departmentComparison: false,
      stakeholderComparison: false,
    },
    allowedReports: ['INSTITUTIONAL'],
    limits: {
      maxUsers: 100,
      maxCampaigns: 3,
      maxParticipantsPerCampaign: 200,
    },
  },
  professional: {
    allowedModules: ['M1_OCAI', 'M2_QCI', 'M4_UWES', 'M5_PKE', 'M6_SPU'],
    features: {
      assessment360: false,
      gapAnalysis: true,
      descriptiveAnalytics: true,
      departmentComparison: true,
      stakeholderComparison: true,
    },
    allowedReports: ['INSTITUTIONAL', 'DEPARTMENT', 'YOKAK_EVIDENCE', 'COMPARATIVE'],
    limits: {
      maxUsers: 500,
      maxCampaigns: 10,
      maxParticipantsPerCampaign: 500,
    },
  },
  enterprise: {
    allowedModules: ['M1_OCAI', 'M2_QCI', 'M3_MSAI', 'M4_UWES', 'M5_PKE', 'M6_SPU'],
    features: {
      assessment360: true,
      gapAnalysis: true,
      descriptiveAnalytics: true,
      departmentComparison: true,
      stakeholderComparison: true,
    },
    allowedReports: ['INSTITUTIONAL', 'DEPARTMENT', 'INDIVIDUAL_360', 'YOKAK_EVIDENCE', 'COMPARATIVE'],
    limits: {
      maxUsers: 2000,
      maxCampaigns: -1,
      maxParticipantsPerCampaign: 2000,
    },
  },
} as const;
