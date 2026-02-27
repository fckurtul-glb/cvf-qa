export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const MODULE_LABELS: Record<string, string> = {
  M1_OCAI: 'OCAI+',
  M2_QCI: 'QCI-TR',
  M3_MSAI: 'MSAI-YÖ (360°)',
  M4_UWES: 'UWES-TR',
  M5_PKE: 'PKE',
  M6_SPU: 'SPU',
};

export const CAMPAIGN_STATUS_MAP: Record<string, {
  label: string;
  color: string;
  bg: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'accent';
  className?: string;
}> = {
  DRAFT: { label: 'Taslak', color: 'text-gray-600', bg: 'bg-gray-100', variant: 'outline', className: 'border-gray-200 text-gray-600' },
  ACTIVE: { label: 'Aktif', color: 'text-green-700', bg: 'bg-green-100', variant: 'default', className: 'bg-green-100 text-green-700 border-green-200' },
  PAUSED: { label: 'Duraklatıldı', color: 'text-yellow-700', bg: 'bg-yellow-100', variant: 'outline', className: 'border-yellow-200 text-yellow-700' },
  COMPLETED: { label: 'Tamamlandı', color: 'text-blue-700', bg: 'bg-blue-100', variant: 'secondary', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  ARCHIVED: { label: 'Arşivlendi', color: 'text-slate-600', bg: 'bg-slate-100', variant: 'outline', className: 'border-slate-200 text-slate-500' },
};
