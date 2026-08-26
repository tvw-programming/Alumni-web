/**
 * Visualisation variants.
 *
 * The orchestrator owns these — they live in `config.json` under
 * `visualization.variants` and arrive over `/api/visual/variants`, so adding a
 * domain metaphor is a JSON block rather than a code change.
 *
 * The copy below is the fallback for two cases the live config cannot serve:
 * the built-in mock transport, which has no backend at all, and an orchestrator
 * older than the endpoint. It mirrors the shipped logistics block; if the two
 * ever disagree, config.json is right.
 */

export interface VisualPalette {
  accent: string;
  accentBright: string;
  accentSoft: string;
  secondary: string;
  completed: string;
  muted: string;
  surface: string;
  surfaceActive: string;
  surfaceCompleted: string;
  surfaceUpcoming: string;
  pattern: string;
}

export interface VisualVariant {
  id: string;
  label: string;
  kicker: string;
  headline: string;
  routeLabel: string;
  /** Which silhouette to draw per step. Only 'truck' is drawn today. */
  vehicle: string;
  motion: string;
  palette: VisualPalette;
}

export interface VisualVariants {
  default: string;
  variants: Record<string, VisualVariant>;
}

export const LOGISTICS_VARIANT: VisualVariant = {
  id: 'logistics',
  label: 'Logistics',
  kicker: 'INTELLIGENT FREIGHT CORRIDOR',
  headline: 'Every release arrives on time',
  routeLabel: 'FREIGHT ROUTE',
  vehicle: 'truck',
  motion: 'speed-route',
  palette: {
    accent: '#55b8ff',
    accentBright: '#dff3ff',
    accentSoft: '#173347',
    secondary: '#ff9f43',
    completed: '#55b8ff',
    muted: '#576d7b',
    surface: '#09151d',
    surfaceActive: '#17384d',
    surfaceCompleted: '#123045',
    surfaceUpcoming: '#101b22',
    pattern:
      'linear-gradient(90deg, transparent 48%, rgba(85,184,255,.045) 49%, rgba(85,184,255,.045) 51%, transparent 52%)',
  },
};

export const FALLBACK_VARIANTS: VisualVariants = {
  default: 'logistics',
  variants: { logistics: LOGISTICS_VARIANT },
};
