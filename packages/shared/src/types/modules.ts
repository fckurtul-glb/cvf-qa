import type { ModuleCode, QuestionFormat, CultureType } from './survey';
import type { PackageTier } from './organization';

export interface ModuleDefinition {
  code: ModuleCode;
  name: string;
  fullName: string;
  itemCount: number;
  format: QuestionFormat;
  dimensions: string[];
  yokakMapping: string[];
  isOriginal: boolean;
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  { code: 'M1_OCAI', name: 'OCAI+', fullName: 'Örgüt Kültürü Değerlendirme Aracı', itemCount: 24, format: 'ipsative', dimensions: ['Klan', 'Adhokrasi', 'Pazar', 'Hiyerarşi'], yokakMapping: ['A.1', 'A.3'], isOriginal: false },
  { code: 'M2_QCI', name: 'QCI-TR', fullName: 'Kalite Kültürü Envanteri', itemCount: 30, format: 'likert_5', dimensions: ['Bağlılık', 'Liderlik', 'İletişim', 'Yetkilendirme', 'Güven', 'Kaynaklar'], yokakMapping: ['A.3'], isOriginal: false },
  { code: 'M3_MSAI', name: 'MSAI-YÖ', fullName: '360° Yönetim Becerileri Değerlendirme', itemCount: 48, format: 'likert_360', dimensions: ['Takım Yönetimi', 'İnovasyon', 'Rekabetçilik', 'Kontrol'], yokakMapping: ['A.2.3'], isOriginal: false },
  { code: 'M4_UWES', name: 'UWES-TR', fullName: 'Utrecht İş Bağlılığı Ölçeği', itemCount: 9, format: 'likert_7', dimensions: ['Dinçlik', 'Adanmışlık', 'Yoğunlaşma'], yokakMapping: ['A.5'], isOriginal: false },
  { code: 'M5_PKE', name: 'PKE', fullName: 'Paydaş Katılım Endeksi', itemCount: 20, format: 'likert_5', dimensions: ['Bilgilenme', 'Danışılma', 'Dahil Olma', 'İşbirliği', 'Yetkilendirme'], yokakMapping: ['A.4'], isOriginal: true },
  { code: 'M6_SPU', name: 'SPU', fullName: 'Stratejik Plan Uyum Analizi', itemCount: 15, format: 'likert_5', dimensions: ['Farkındalık', 'Benimseme', 'Uygulama', 'İzleme', 'Uyum'], yokakMapping: ['A.1', 'A.6'], isOriginal: true },
];

export const CULTURE_LABELS: Record<CultureType, string> = {
  clan: 'Klan (Aile)', adhocracy: 'Adhokrasi (Yenilik)', market: 'Pazar (Rekabet)', hierarchy: 'Hiyerarşi (Kontrol)',
};

export const PACKAGE_MODULE_MAP: Record<PackageTier, ModuleCode[]> = {
  starter: ['M1_OCAI', 'M2_QCI', 'M4_UWES'],
  professional: ['M1_OCAI', 'M2_QCI', 'M4_UWES', 'M5_PKE', 'M6_SPU'],
  enterprise: ['M1_OCAI', 'M2_QCI', 'M3_MSAI', 'M4_UWES', 'M5_PKE', 'M6_SPU'],
};
