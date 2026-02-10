export type ReportType = 'institutional' | 'department' | 'individual_360' | 'yokak_evidence' | 'comparative';
export type ReportFormat = 'pdf' | 'excel' | 'json' | 'pptx';

export interface Report {
  id: string;
  campaignId: string;
  orgId: string;
  reportType: ReportType;
  scope: string;
  generatedAt: Date;
  filePath: string;
  accessTokenHash: string;
}

export interface GapAnalysis {
  cultureType: import('./survey').CultureType;
  current: number;
  preferred: number;
  gap: number;
  direction: 'increase' | 'decrease' | 'maintain';
  priority: 'high' | 'medium' | 'low';
}

export interface YokakEvidenceMap {
  criterion: string;
  criterionName: string;
  moduleSource: import('./survey').ModuleCode;
  evidenceDescription: string;
  maturityLevel: 1 | 2 | 3 | 4 | 5;
}
