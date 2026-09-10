import { decomposeColor, recomposeColor } from '@mui/material/styles';
import type { RunStep, StepStatus } from '../../types/workflow';
import type { VisualVariant } from '../../data/visualVariants';
import { tokens } from '../../theme';

/**
 * Run status, in the visualisation's own vocabulary.
 *
 * The route has five states where the run has nine, because a silhouette can
 * only carry so much: what a viewer needs from a truck is whether it has passed,
 * is moving, is stuck, is waiting on a person, or has not set off.
 */
export type RouteStatus = 'cleared' | 'moving' | 'waiting' | 'failed' | 'upcoming';

const BY_STATUS: Record<StepStatus, RouteStatus> = {
  SUCCESS: 'cleared',
  APPROVED: 'cleared',
  RUNNING: 'moving',
  AWAITING_APPROVAL: 'waiting',
  BLOCKED: 'waiting',
  FAILED: 'failed',
  REJECTED: 'failed',
  PENDING: 'upcoming',
  SKIPPED: 'upcoming',
  // Waiting, not failed: the freight has not broken down, it has been left
  // standing, and what it needs is someone to start it moving again.
  STALLED: 'waiting',
  // Waiting on a person, exactly as a gate is.
  NEEDS_INPUT: 'waiting',
};

export function routeStatus(step: RunStep): RouteStatus {
  return BY_STATUS[step.status];
}

/**
 * Waiting and failed keep the dashboard's own amber and rose rather than taking
 * the variant's palette: a reviewer learns one colour language for "you are
 * needed" and it should not change because the drawing did.
 */
export function routeColor(status: RouteStatus, variant: VisualVariant): string {
  switch (status) {
    case 'cleared':
      return variant.palette.completed;
    case 'moving':
      return variant.palette.accentBright;
    case 'waiting':
      return tokens.signal;
    case 'failed':
      return tokens.fail;
    default:
      return variant.palette.muted;
  }
}

export function routeFill(status: RouteStatus, variant: VisualVariant): string {
  switch (status) {
    case 'cleared':
      return variant.palette.surfaceCompleted;
    case 'moving':
      return variant.palette.surfaceActive;
    case 'waiting':
      return '#302718';
    case 'failed':
      return '#2c161b';
    default:
      return variant.palette.surfaceUpcoming;
  }
}

/** A tint of `over` mixed into `base`, as an opaque colour. */
function mix(base: string, over: string, ratio: number): string {
  const a = decomposeColor(base).values;
  const b = decomposeColor(over).values;
  return recomposeColor({
    type: 'rgb',
    values: [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * ratio)) as [number, number, number],
  });
}

/**
 * The ground under a plain card.
 *
 * Same five states, but always opaque and always the variant's own surface with
 * the status mixed in, rather than the two fixed warm tints the truck uses. A
 * card whose "needs you" fill came from another palette would look borrowed,
 * and the whole point of the plain card is that it looks decided.
 *
 * `override` is the config's `card.background`; a variant that names one colour
 * gets exactly that colour, for every status.
 */
export function cardFill(status: RouteStatus, variant: VisualVariant, override = ''): string {
  if (override) return override;
  const surface = variant.palette.surface;
  switch (status) {
    case 'cleared':
      return variant.palette.surfaceCompleted;
    case 'moving':
      return variant.palette.surfaceActive;
    case 'waiting':
      return mix(surface, tokens.signal, 0.1);
    case 'failed':
      return mix(surface, tokens.fail, 0.1);
    default:
      return variant.palette.surfaceUpcoming;
  }
}
