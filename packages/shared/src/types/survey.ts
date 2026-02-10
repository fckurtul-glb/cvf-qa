export type ModuleCode = 'M1_OCAI' | 'M2_QCI' | 'M3_MSAI' | 'M4_UWES' | 'M5_PKE' | 'M6_SPU';
export type QuestionFormat = 'ipsative' | 'likert_5' | 'likert_7' | 'likert_360';
export type SurveyStatus = 'not_started' | 'in_progress' | 'completed' | 'expired';
export type Perspective360 = 'self' | 'subordinate' | 'peer' | 'superior';
export type CultureType = 'clan' | 'adhocracy' | 'market' | 'hierarchy';

export interface CultureProfile {
  clan: number;
  adhocracy: number;
  market: number;
  hierarchy: number;
}

export interface SurveyToken {
  id: string;
  campaignId: string;
  tokenHash: string;
  moduleSet: ModuleCode[];
  expiresAt: Date;
  maxUses: number;
  usedCount: number;
  fingerprintHash: string | null;
}

export interface IpsativeQuestion {
  id: string;
  moduleCode: 'M1_OCAI';
  questionNumber: number;
  dimension: string;
  alternatives: { key: 'A' | 'B' | 'C' | 'D'; text: string; cultureType: CultureType }[];
}

export interface LikertQuestion {
  id: string;
  moduleCode: ModuleCode;
  questionNumber: number;
  dimension: string;
  text: string;
  scaleMin: number;
  scaleMax: number;
  reverseScored: boolean;
}

export interface IpsativeAnswer {
  questionId: string;
  distribution: { A: number; B: number; C: number; D: number }; // sum = 100
}

export interface LikertAnswer {
  questionId: string;
  value: number;
}

export interface SurveySession {
  sessionId: string;
  anonymousParticipantId: string;
  campaignId: string;
  modules: ModuleCode[];
  currentModule: number;
  currentQuestion: number;
  startedAt: Date;
  lastSavedAt: Date;
  answers: Record<string, IpsativeAnswer | LikertAnswer>;
}
