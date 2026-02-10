import { SURVEY } from '../constants';
import type { IpsativeAnswer, LikertAnswer, ModuleCode } from '../types';

export function validateIpsativeAnswer(answer: IpsativeAnswer): { valid: boolean; error?: string } {
  const { A, B, C, D } = answer.distribution;
  const sum = A + B + C + D;
  if (sum !== SURVEY.IPSATIVE_SUM) return { valid: false, error: `Toplam ${SURVEY.IPSATIVE_SUM} olmalı, şu an: ${sum}` };
  if ([A, B, C, D].some((v) => v < 0)) return { valid: false, error: 'Negatif değer olamaz' };
  if ([A, B, C, D].some((v) => !Number.isInteger(v))) return { valid: false, error: 'Tam sayı olmalı' };
  return { valid: true };
}

export function validateLikertAnswer(answer: LikertAnswer, scaleMin: number, scaleMax: number): { valid: boolean; error?: string } {
  if (answer.value < scaleMin || answer.value > scaleMax) return { valid: false, error: `Değer ${scaleMin}-${scaleMax} arasında olmalı` };
  if (!Number.isInteger(answer.value)) return { valid: false, error: 'Tam sayı olmalı' };
  return { valid: true };
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateModuleSet(modules: ModuleCode[], allowed: ModuleCode[]): { valid: boolean; unauthorized: ModuleCode[] } {
  const unauthorized = modules.filter((m) => !allowed.includes(m));
  return { valid: unauthorized.length === 0, unauthorized };
}

export function validateCSVHeaders(headers: string[], required: string[]): { valid: boolean; missing: string[] } {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const missing = required.filter((r) => !lower.includes(r.toLowerCase()));
  return { valid: missing.length === 0, missing };
}
