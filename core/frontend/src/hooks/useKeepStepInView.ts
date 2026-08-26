import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { RunStep, StepStatus } from '../types/workflow';

/**
 * Which of the twenty-four steps the view should be showing.
 *
 * Ordered by what a reader needs first, not by step number: something running
 * is where the run is now; a failure has stopped it and wants a person; a gate
 * is waiting on one. Only when none of those exist does the next pending step
 * answer "what happens next".
 */
const PRIORITY: StepStatus[] = ['RUNNING', 'FAILED', 'REJECTED', 'AWAITING_APPROVAL', 'BLOCKED'];

export function focusedStep(steps: RunStep[]): RunStep | null {
  for (const status of PRIORITY) {
    const hit = steps.find((s) => s.status === status);
    if (hit) return hit;
  }
  return steps.find((s) => s.status === 'PENDING') ?? null;
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/**
 * Keep the step that matters in view, centred where the track is long enough
 * to centre it and flush to the start where it is not — the first and last few
 * steps can never sit in the middle, and leaving them half off the edge is
 * worse than admitting the track has ends.
 *
 * Fires only when the tracked step changes. The dashboard re-polls on a timer,
 * and a reader who has scrolled off to read step 03 should not be dragged back
 * every time the same run is fetched again.
 */
export function useKeepStepInView(
  viewport: RefObject<HTMLElement | null>,
  stepNumber: number | null,
  orientation: 'horizontal' | 'vertical',
): void {
  const shown = useRef<number | null>(null);

  useEffect(() => {
    if (stepNumber === null || shown.current === stepNumber) return;
    const node = viewport.current;
    const target = node?.querySelector<HTMLElement>(`[data-step="${stepNumber}"]`);
    if (!node || !target) return;
    shown.current = stepNumber;

    const behavior = scrollBehavior();

    // Vertically the track is laid out down the page rather than inside a
    // scrolling box, so the window is what has to move. The browser already
    // clamps at the ends, which is the same "as close to centred as it gets"
    // the horizontal branch works out by hand.
    if (orientation === 'vertical') {
      target.scrollIntoView({ block: 'center', behavior });
      return;
    }

    // A track short enough to fit has every step in view already. Scrolling the
    // window to centre one would move the page for no reason.
    if (node.scrollWidth <= node.clientWidth) return;

    const nodeRect = node.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    //  Where the step sits inside the scrolled content, not inside the window.
    const start = node.scrollLeft + (targetRect.left - nodeRect.left);
    const centred = start - (node.clientWidth - targetRect.width) / 2;
    const furthest = node.scrollWidth - node.clientWidth;
    const reachable = Math.max(0, Math.min(centred, furthest));

    node.scrollTo({
      // Centring was possible: take it. Otherwise put the step at the leading
      // edge, which is as near the middle as this end of the track allows.
      left: reachable === centred ? centred : Math.max(0, Math.min(start, furthest)),
      behavior,
    });
  }, [viewport, stepNumber, orientation]);
}
