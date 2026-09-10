/**
 * Visualisation variants.
 *
 * The orchestrator owns these — they live in `config.json` under
 * `visualization.variants` and arrive over `/api/visual/variants`, so adding a
 * domain metaphor is a JSON block rather than a code change.
 *
 * The copy below is the fallback for two cases the live config cannot serve:
 * the built-in mock transport, which has no backend at all, and an orchestrator
 * older than the endpoint. It mirrors the shipped blocks; if the two ever
 * disagree, config.json is right.
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

/**
 * The shell one step is drawn in, when the variant draws a plain card.
 *
 * A surface reads as confident when it signals precision, stability and a
 * single authority: one hairline stroke, near-sharp corners, an opaque ground,
 * and depth from a single barely-there offset layer rather than a stack of
 * rectangles. The values are strings because they are CSS — config sets them,
 * this file only says what they default to.
 *
 * Empty strings mean "derive it from the step's status colour"; that is how one
 * card block serves running, success, waiting, failed and upcoming at once.
 */
export interface VisualCard {
  borderWidth: string;
  borderStyle: string;
  borderColor: string;
  radius: string;
  background: string;
  shadow: string;
  hoverShadow: string;
  depthLayer: boolean;
  depthOffset: string;
  depthOpacity: number;
  /** 'left' | 'top' | 'none' — unknown values are treated as 'none'. */
  accentEdge: string;
  accentWidth: string;
  /** 'bars' | 'dots' | 'none' — unknown values are treated as 'none'. */
  indicator: string;

  // -- state treatment ------------------------------------------------- //
  activeAccentWidth: string;
  /** 'scan' | 'pulse' | 'none'. */
  activeAnimation: string;
  activeAnimationMs: number;
  activeShadow: string;
  completedOpacity: number;
  upcomingOpacity: number;
  upcomingBorderStyle: string;
}

export interface VisualVariant {
  id: string;
  label: string;
  kicker: string;
  headline: string;
  routeLabel: string;
  /**
   * Which silhouette to draw per step. 'card' — with 'plain' and 'none' as
   * synonyms — draws the plain rectangle; anything else draws the truck, the
   * only silhouette in the code today.
   */
  vehicle: string;
  motion: string;
  palette: VisualPalette;
  /** Absent from an orchestrator older than the card block; see `cardStyle`. */
  card?: Partial<VisualCard>;
}

export interface VisualVariants {
  default: string;
  variants: Record<string, VisualVariant>;
}

/** Mirrors `VisualCard` in the backend config model. */
export const DEFAULT_CARD: VisualCard = {
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '',
  radius: '3px',
  background: '',
  shadow: '1px 1px 0 rgba(0,0,0,0.04)',
  hoverShadow: '2px 2px 0 rgba(0,0,0,0.10)',
  depthLayer: true,
  depthOffset: '2px',
  depthOpacity: 0.08,
  accentEdge: 'left',
  accentWidth: '2px',
  indicator: 'bars',
  activeAccentWidth: '3px',
  activeAnimation: 'scan',
  activeAnimationMs: 1800,
  activeShadow: '',
  completedOpacity: 0.86,
  upcomingOpacity: 0.5,
  upcomingBorderStyle: 'dashed',
};

/**
 * The card rules for one variant, with every gap filled.
 *
 * A config may set two of the twenty keys, and an orchestrator predating the
 * block sets none, so nothing downstream should have to test for `undefined`.
 */
export function cardStyle(variant: VisualVariant): VisualCard {
  return { ...DEFAULT_CARD, ...(variant.card ?? {}) };
}

/** Does this variant draw the plain card rather than a silhouette? */
export function drawsPlainCard(variant: VisualVariant): boolean {
  return ['card', 'plain', 'none'].includes(variant.vehicle);
}

/** The shipped default: a plain, decided surface per step. */
export const PRECISION_VARIANT: VisualVariant = {
  id: 'precision',
  label: 'Precision',
  kicker: 'SUPERVISED DELIVERY PIPELINE',
  headline: 'Twenty-four steps, one controlled system',
  routeLabel: 'PROCESS STEPS',
  vehicle: 'card',
  motion: 'none',
  palette: {
    accent: '#8ea2c6',
    // The running step's colour, and the app's own: the same periwinkle the
    // status chips and the phase strip already use for RUNNING.
    accentBright: '#7c8cf8',
    accentSoft: '#20242f',
    secondary: '#7c8cf8',
    completed: '#4fc3a1',
    muted: '#5c6178',
    surface: '#12141b',
    surfaceActive: '#1b2030',
    surfaceCompleted: '#15181f',
    surfaceUpcoming: '#131519',
    pattern: '',
  },
  card: DEFAULT_CARD,
};

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
  default: 'precision',
  variants: { precision: PRECISION_VARIANT, logistics: LOGISTICS_VARIANT },
};
