// Single source of truth for shared frontend constants
// API_URL re-exports from env (legacy import compatibility)
import { env } from './env';

export const API_URL = env.apiUrl;

// Module code → display label mapping
export const MODULE_LABELS: Record<string, string> = {
  M1_OCAI: 'OCAI+',
  M2_QCI: 'QCI-TR',
  M3_MSAI: 'MSAI-YÖ (360°)',
  M4_UWES: 'UWES-TR',
  M5_PKE: 'PKE',
  M6_SPU: 'SPU',
};

// Campaign status → UI config mapping
export const CAMPAIGN_STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  DRAFT: {
    label: 'Taslak',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
  },
  ACTIVE: {
    label: 'Aktif',
    color: 'text-green-700',
    bg: 'bg-green-100',
  },
  PAUSED: {
    label: 'Duraklatıldı',
    color: 'text-yellow-700',
    bg: 'bg-yellow-100',
  },
  COMPLETED: {
    label: 'Tamamlandı',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
  },
  CANCELLED: {
    label: 'İptal Edildi',
    color: 'text-red-700',
    bg: 'bg-red-100',
  },
};
