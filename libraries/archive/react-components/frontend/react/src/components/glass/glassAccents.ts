/**
 * Accent gradients used by the multi-colored 3D cards (Team, KPI cards).
 * Ported from the CodeGen project (src/app/theme/glass.ts). They overlay the
 * theme's surface, so they work across plain / glass / 3D-glass styles.
 */
export const glassAccents = {
  violet: 'linear-gradient(135deg, rgba(124,99,255,0.45), rgba(124,99,255,0.08))',
  pink: 'linear-gradient(135deg, rgba(255,95,162,0.45), rgba(255,95,162,0.08))',
  teal: 'linear-gradient(135deg, rgba(24,194,194,0.45), rgba(24,194,194,0.08))',
  amber: 'linear-gradient(135deg, rgba(255,176,32,0.45), rgba(255,176,32,0.08))',
} as const;

export type GlassAccent = keyof typeof glassAccents;
