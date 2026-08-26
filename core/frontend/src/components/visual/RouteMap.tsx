import { useEffect, useRef } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { RemediationEdge, RunStep, StepAction } from '../../types/workflow';
import type { VisualVariant } from '../../data/visualVariants';
import { fonts, tokens } from '../../theme';
import RouteConnector from './RouteConnector';
import TruckCard from './TruckCard';
import { routeStatus } from './routeStatus';

interface Props {
  steps: RunStep[];
  edges: RemediationEdge[];
  variant: VisualVariant;
  orientation: 'horizontal' | 'vertical';
  onInspect: (step: RunStep) => void;
  onAction: (step: RunStep, action: StepAction) => void;
  busy?: boolean;
}

/** Height of the horizontal scrollbar, in px. Deliberately larger than the
 *  platform default: the route is twenty-four cards wide, so dragging the bar
 *  is the fast way across it and a 7px overlay strip is hard to catch. */
const SCROLLBAR = 14;

/**
 * A scrollbar built to be grabbed.
 *
 * Size only — the colours stay the application's, from the `::-webkit-scrollbar`
 * rules in the theme's CssBaseline. A scrollbar is chrome, and giving this one a
 * palette of its own would make it compete with the route it scrolls.
 *
 * Radii in px, not sx units: a bare number there is a multiple of the theme's
 * shape.borderRadius, which is not what a scrollbar wants.
 */
const scrollbarSx = {
  // 'auto' is as thick as Firefox goes; the height below is for WebKit.
  scrollbarWidth: 'auto' as const,
  '&::-webkit-scrollbar': { height: SCROLLBAR },
  '&::-webkit-scrollbar-track': { margin: '0 8px' },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: `${SCROLLBAR / 2}px`,
    // Keeps the bar draggable however long the route gets.
    minWidth: 56,
  },
};

/**
 * The run as a freight route.
 *
 * Same data and the same interactions as the spine — every step in order, gates
 * marked, selecting one opens its dialog — drawn as a convoy instead of a rail.
 * Nothing here reads the run differently; it is the same array of steps.
 */
export default function RouteMap({
  steps,
  edges,
  variant,
  orientation,
  onInspect,
  onAction,
  busy,
}: Props) {
  const viewport = useRef<HTMLDivElement | null>(null);
  const horizontal = orientation === 'horizontal';
  const cleared = steps.filter((s) => routeStatus(s) === 'cleared').length;

  // Keep whatever the run is working on in view, without scrolling the page.
  useEffect(() => {
    if (!horizontal || !viewport.current) return;
    const node = viewport.current;
    const active = node.querySelector<HTMLElement>('[aria-current="step"]');
    if (!active) return;
    const nodeRect = node.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    node.scrollTo({
      left: node.scrollLeft + activeRect.left - nodeRect.left - node.clientWidth / 2 + activeRect.width / 2,
      behavior: 'smooth',
    });
  }, [horizontal, steps]);

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1, px: 0.5 }}
      >
        <Typography sx={{ fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: '.09em', color: 'text.secondary' }}>
          {variant.routeLabel}
        </Typography>
        <Typography sx={{ fontFamily: fonts.mono, fontSize: 11, color: variant.palette.accentBright }}>
          {/* One interpolation, so the count reads as a single phrase. */}
          {`${cleared} / ${steps.length} CLEARED`}
        </Typography>
      </Stack>

      <Box
        ref={viewport}
        aria-label={`${variant.label} route — ${steps.length} steps`}
        sx={{
          position: 'relative',
          width: '100%',
          overflowX: horizontal ? 'auto' : 'visible',
          overflowY: 'visible',
          borderRadius: 1,
          border: `1px solid ${tokens.rule}`,
          backgroundImage: variant.palette.pattern,
          backgroundSize: '32px 32px',
          bgcolor: variant.palette.surface,
          px: 2,
          pt: 3,
          // The scrollbar sits inside the bordered box, so the cards give it
          // room rather than sharing the bottom edge with it.
          pb: horizontal ? 1.5 : 3,
          ...(horizontal ? scrollbarSx : {}),
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: horizontal ? 'row' : 'column',
            alignItems: horizontal ? 'center' : 'stretch',
            minWidth: horizontal ? 'max-content' : 0,
            maxWidth: horizontal ? 'none' : 660,
            mx: horizontal ? 0 : 'auto',
          }}
        >
          {steps.map((step, index) => (
            <Box
              key={step.step}
              sx={{
                display: 'flex',
                flexDirection: horizontal ? 'row' : 'column',
                alignItems: horizontal ? 'center' : 'stretch',
                width: horizontal ? 'auto' : '100%',
              }}
            >
              <TruckCard
                step={step}
                variant={variant}
                orientation={orientation}
                onInspect={onInspect}
                onAction={onAction}
                busy={busy}
              />
              {index < steps.length - 1 && (
                <RouteConnector
                  orientation={orientation}
                  // The corridor is lit where the freight has already passed.
                  energized={routeStatus(step) === 'cleared'}
                  variant={variant}
                />
              )}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Remediation edges are part of the run's shape, so the route says which
          ones have actually been taken rather than drawing a clean line. */}
      {edges.some((e) => e.loopsUsed > 0) && (
        <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap', mt: 1.5, px: 0.5 }}>
          {edges
            .filter((e) => e.loopsUsed > 0)
            .map((edge) => (
              <Typography
                key={`${edge.from}-${edge.on}-${edge.to}`}
                sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.signal }}
              >
                {String(edge.from).padStart(2, '0')} → {String(edge.to).padStart(2, '0')} on {edge.on} · loop{' '}
                {edge.loopsUsed}/{edge.maxLoops}
              </Typography>
            ))}
        </Stack>
      )}
    </Box>
  );
}
