import { useId } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { VisualVariant } from '../../data/visualVariants';

interface Props {
  /** True once the run has passed this point — the freight is flowing. */
  energized: boolean;
  orientation: 'horizontal' | 'vertical';
  variant: VisualVariant;
  /**
   * 'corridor' is the freight metaphor's widening lane; 'rule' is a hairline
   * with a chevron, for a variant whose cards are plain rectangles — a lane
   * between two engineered surfaces would be the loudest thing on screen.
   */
  shape?: 'corridor' | 'rule';
}

/**
 * The flow between two steps.
 *
 * The dash animates in CSS rather than through an animation library, which
 * keeps the dependency list where it is and lets `prefers-reduced-motion` stop
 * it with one media query.
 */
export default function RouteConnector({ energized, orientation, variant, shape = 'corridor' }: Props) {
  const rawId = useId();
  const dashName = `routeDash${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const stroke = energized ? variant.palette.completed : variant.palette.muted;
  const dim = energized ? 1 : 0.42;

  if (shape === 'rule') {
    const horizontal = orientation === 'horizontal';
    return (
      <Box
        aria-hidden="true"
        sx={{
          flex: horizontal ? '0 0 26px' : '0 0 22px',
          width: horizontal ? 26 : 22,
          height: horizontal ? 22 : 22,
          mx: horizontal ? 0 : 'auto',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Box
          component="svg"
          viewBox="0 0 26 12"
          sx={{
            width: 26,
            height: 12,
            overflow: 'visible',
            transform: horizontal ? 'none' : 'rotate(90deg)',
          }}
        >
          <path
            d="M0 6H21"
            stroke={energized ? stroke : alpha(stroke, 0.55)}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M18 2.5L22 6L18 9.5"
            fill="none"
            stroke={energized ? stroke : alpha(stroke, 0.55)}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      aria-hidden="true"
      sx={{
        flex: orientation === 'horizontal' ? '0 0 70px' : '0 0 62px',
        width: orientation === 'horizontal' ? 70 : 76,
        height: orientation === 'horizontal' ? 50 : 62,
        mx: orientation === 'horizontal' ? 0 : 'auto',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 70 50"
        sx={{
          width: 70,
          height: 50,
          overflow: 'visible',
          transform: orientation === 'vertical' ? 'rotate(90deg)' : 'none',
          [`@keyframes ${dashName}`]: { to: { strokeDashoffset: -20 } },
          '@media (prefers-reduced-motion: reduce)': { '& .route-dash': { animation: 'none' } },
        }}
      >
        <path d="M0 8L70 0V50L0 42Z" fill={variant.palette.surfaceUpcoming} stroke={stroke} opacity={dim} />
        <path
          className="route-dash"
          d="M3 25L68 25"
          stroke={variant.palette.accentBright}
          strokeWidth="3"
          strokeDasharray="10 10"
          opacity={dim}
          style={energized ? { animation: `${dashName} .65s linear infinite` } : undefined}
        />
        <path
          d="M51 14L64 25L51 36"
          fill="none"
          stroke={variant.palette.secondary}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={dim}
        />
      </Box>
    </Box>
  );
}
