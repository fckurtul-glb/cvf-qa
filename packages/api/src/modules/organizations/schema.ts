import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Kurum adı en az 2 karakter olmalı'),
  domain: z.string().min(3, 'Domain en az 3 karakter olmalı').regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Geçerli bir domain girin'),
  packageTier: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).default('STARTER'),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  domain: z.string().min(3).regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Geçerli bir domain girin').optional(),
  packageTier: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  settings: z.record(z.unknown()).optional(),
});

export const createInviteSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  role: z.enum(['ORG_ADMIN', 'UNIT_ADMIN']).default('ORG_ADMIN'),
});

export const listOrganizationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

// ── Yeni Şemalar ──

const moduleCodeEnum = z.enum(['M1_OCAI', 'M2_QCI', 'M3_MSAI', 'M4_UWES', 'M5_PKE', 'M6_SPU']);
const reportCodeEnum = z.enum(['INSTITUTIONAL', 'DEPARTMENT', 'INDIVIDUAL_360', 'YOKAK_EVIDENCE', 'COMPARATIVE']);

export const updateCapabilitiesSchema = z.object({
  allowedModules: z.array(moduleCodeEnum).optional(),
  features: z.object({
    assessment360: z.boolean().optional(),
    gapAnalysis: z.boolean().optional(),
    descriptiveAnalytics: z.boolean().optional(),
    departmentComparison: z.boolean().optional(),
    stakeholderComparison: z.boolean().optional(),
  }).optional(),
  allowedReports: z.array(reportCodeEnum).optional(),
  limits: z.object({
    maxUsers: z.number().int().min(-1).optional(),
    maxCampaigns: z.number().int().min(-1).optional(),
    maxParticipantsPerCampaign: z.number().int().min(-1).optional(),
  }).optional(),
});

export const emailLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['QUEUED', 'SENT', 'FAILED', 'BOUNCED']).optional(),
  template: z.string().optional(),
});

export const orgUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['SUPER_ADMIN', 'ORG_ADMIN', 'UNIT_ADMIN', 'PARTICIPANT', 'VIEWER']).optional(),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});
