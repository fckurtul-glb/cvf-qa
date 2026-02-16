// CVF-QA Design Tokens
// Single source of truth for design constants

export const colors = {
  primary: { hex: '#254E70', hsl: '204 49% 29%' },
  secondary: { hex: '#37718E', hsl: '200 43% 39%' },
  accent: { hex: '#C33C54', hsl: '349 52% 50%' },
  frosted: { hex: '#8EE3EF', hsl: '187 74% 75%' },
  icy: { hex: '#AEF3E7', hsl: '167 74% 82%' },
  surface: { hex: '#FFFFFF', hsl: '0 0% 100%' },
  text: { hex: '#1A1A2E', hsl: '240 28% 14%' },
  textMuted: { hex: '#64748B', hsl: '215 16% 47%' },
  darkBg: { hex: '#0F172A', hsl: '222 47% 11%' },
} as const;

export const semantic = {
  success: { hex: '#22C55E', hsl: '142 71% 45%' },
  warning: { hex: '#F59E0B', hsl: '38 92% 50%' },
  error: { hex: '#EF4444', hsl: '0 84% 60%' },
  info: { hex: '#3B82F6', hsl: '217 91% 60%' },
} as const;

export const cultureColors = {
  clan: { hex: '#8EE3EF', label: 'Klan', tw: 'frosted' },
  adhocracy: { hex: '#C33C54', label: 'Adhokrasi', tw: 'accent' },
  market: { hex: '#37718E', label: 'Pazar', tw: 'secondary' },
  hierarchy: { hex: '#254E70', label: 'Hiyerarşi', tw: 'primary' },
} as const;

export const fonts = {
  display: 'Playfair Display',
  body: 'DM Sans',
  mono: 'JetBrains Mono',
} as const;

export const fontScale = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem',    // 48px
} as const;

export const spacing = {
  0: '0px',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
  24: '6rem',    // 96px
} as const;

export const motion = {
  micro: '150ms',
  normal: '300ms',
  page: '500ms',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const radius = {
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
} as const;
