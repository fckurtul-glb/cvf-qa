import type { CultureProfile, CultureType } from '../types';

export function calculateCultureProfile(answers: Array<{ A: number; B: number; C: number; D: number }>): CultureProfile {
  const n = answers.length || 1;
  return {
    clan: Math.round(answers.reduce((s, a) => s + a.A, 0) / n * 10) / 10,
    adhocracy: Math.round(answers.reduce((s, a) => s + a.B, 0) / n * 10) / 10,
    market: Math.round(answers.reduce((s, a) => s + a.C, 0) / n * 10) / 10,
    hierarchy: Math.round(answers.reduce((s, a) => s + a.D, 0) / n * 10) / 10,
  };
}

export function calculateGap(current: CultureProfile, preferred: CultureProfile) {
  const types: CultureType[] = ['clan', 'adhocracy', 'market', 'hierarchy'];
  return types.map((type) => ({
    type,
    current: current[type],
    preferred: preferred[type],
    gap: Math.round((preferred[type] - current[type]) * 10) / 10,
    absGap: Math.abs(Math.round((preferred[type] - current[type]) * 10) / 10),
  })).sort((a, b) => b.absGap - a.absGap);
}

export function calculateLikertDimensionScores(
  answers: Array<{ dimension: string; value: number; reverseScored: boolean; scaleMax: number }>,
): Record<string, { mean: number; sd: number; n: number }> {
  const grouped: Record<string, number[]> = {};
  for (const a of answers) {
    const val = a.reverseScored ? a.scaleMax + 1 - a.value : a.value;
    if (!grouped[a.dimension]) grouped[a.dimension] = [];
    grouped[a.dimension].push(val);
  }
  const result: Record<string, { mean: number; sd: number; n: number }> = {};
  for (const [dim, values] of Object.entries(grouped)) {
    const n = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1 || 1);
    result[dim] = { mean: Math.round(mean * 100) / 100, sd: Math.round(Math.sqrt(variance) * 100) / 100, n };
  }
  return result;
}

export function generateAnonymousId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function formatTurkishDate(date: Date): string {
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}
