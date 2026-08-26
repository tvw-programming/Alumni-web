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
