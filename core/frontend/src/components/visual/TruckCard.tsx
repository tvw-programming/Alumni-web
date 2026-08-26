import { useId } from 'react';
import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/CheckCircleRounded';
import GavelIcon from '@mui/icons-material/Gavel';
import type { RunStep, StepAction } from '../../types/workflow';
import type { VisualVariant } from '../../data/visualVariants';
import { fonts, statusMeta, tokens } from '../../theme';
import ActionButtons, { isInspectable } from '../dashboard/ActionButtons';
import { routeColor, routeFill, routeStatus } from './routeStatus';

interface Props {
  step: RunStep;
  variant: VisualVariant;
  orientation: 'horizontal' | 'vertical';
  onInspect: (step: RunStep) => void;
  onAction: (step: RunStep, action: StepAction) => void;
  busy?: boolean;
}

/**
 * One step, drawn as a freight truck.
 *
 * The silhouette is an SVG behind the card so it stays crisp at any size while
 * the content above it remains ordinary semantic HTML — the step number, title
 * and status are text a screen reader can read, not paths.
 */
export default function TruckCard({ step, variant, orientation, onInspect, onAction, busy }: Props) {
  const rawId = useId();
  const gradientId = `truck-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const status = routeStatus(step);
  const color = routeColor(status, variant);
  const fill = routeFill(status, variant);
  const isGate = step.kind === 'GATE';
  const horizontal = orientation === 'horizontal';
  const decidable = isGate && step.status === 'AWAITING_APPROVAL';

  // Inert rather than clickable when there is nothing behind it: out of the tab
  // order, announced as disabled, and visibly dimmed.
  const inspectable = isInspectable(step);

  const card = (
    <Box
      {...(inspectable
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: () => onInspect(step),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onInspect(step);
              }
            },
          }
        : { 'aria-disabled': true })}
      aria-current={status === 'moving' || status === 'waiting' ? 'step' : undefined}
      aria-label={`Step ${step.step}: ${step.title}, ${statusMeta[step.status].label}${
        inspectable ? '' : ' — not started, nothing to inspect'
      }`}
      sx={{
        position: 'relative',
        flex: '0 0 auto',
        width: horizontal ? 240 : '100%',
        maxWidth: horizontal ? 'none' : 370,
        // A gate carries decision controls, so it needs the extra room for them.
        minHeight: horizontal ? (decidable ? 200 : 180) : 200,
        mx: horizontal ? 0 : 'auto',
        cursor: inspectable ? 'pointer' : 'default',
        opacity: inspectable ? 1 : 0.55,
        transition: 'transform 200ms ease, filter 200ms ease',
        ...(inspectable && {
          '&:hover': {
            transform: horizontal ? 'translateY(-4px)' : 'translateX(4px)',
            filter: `drop-shadow(0 12px 20px ${alpha(color, 0.25)})`,
          },
        }),
        '&:focus-visible': { outline: `2px solid ${color}`, outlineOffset: 4 },
        '@media (prefers-reduced-motion: reduce)': { '& .truck-pulse': { animation: 'none' } },
        '@keyframes truckPulse': {
          '0%, 100%': { opacity: 0.55 },
          '50%': { opacity: 1 },
        },
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 240 180"
        preserveAspectRatio="none"
        aria-hidden="true"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={fill} />
            <stop offset=".68" stopColor={variant.palette.surface} />
            <stop offset="1" stopColor={fill} />
          </linearGradient>
        </defs>
        {/* Trailer plus cab, then the cab window, mirror and two wheels. */}
        <path
          d="M14 39H151V30H183L224 76V139H207A23 23 0 01161 139H75A23 23 0 0129 139H14V39Z"
          fill={`url(#${gradientId})`}
          stroke={color}
          strokeWidth={status === 'upcoming' ? 1.2 : 1.8}
          vectorEffect="non-scaling-stroke"
        />
        <path d="M164 45H181L207 76H164V45Z" fill={variant.palette.accentSoft} stroke={color} opacity=".8" vectorEffect="non-scaling-stroke" />
        <path d="M210 91H223" stroke={variant.palette.secondary} strokeWidth="4" vectorEffect="non-scaling-stroke" />
        <circle cx="52" cy="139" r="15" fill={variant.palette.surface} stroke={color} strokeWidth="5" vectorEffect="non-scaling-stroke" />
        <circle cx="184" cy="139" r="15" fill={variant.palette.surface} stroke={color} strokeWidth="5" vectorEffect="non-scaling-stroke" />
      </Box>

      {/* Content sits inside the trailer, clear of the cab and the wheels. */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          p: horizontal ? '44px 56px 40px 26px' : '34px 76px 34px 30px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 0.75,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
          {/* The decision controls belong to the step icon: under it when the
              route runs across, beside it when the route runs down. */}
          <Stack
            direction={horizontal ? 'column' : 'row'}
            spacing={horizontal ? 0.75 : 1}
            sx={{ alignItems: horizontal ? 'flex-start' : 'center', minWidth: 0 }}
          >
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color,
                bgcolor: alpha(color, 0.12),
                border: `1px solid ${alpha(color, 0.4)}`,
                flexShrink: 0,
                ...(status === 'moving' && { animation: 'truckPulse 1.6s ease-in-out infinite' }),
              }}
              className={status === 'moving' ? 'truck-pulse' : undefined}
            >
              {status === 'cleared' ? (
                <CheckIcon sx={{ fontSize: 17 }} />
              ) : isGate ? (
                <GavelIcon sx={{ fontSize: 16 }} />
              ) : (
                <Typography sx={{ fontFamily: fonts.mono, fontSize: 11, fontWeight: 600 }}>
                  {String(step.step).padStart(2, '0')}
                </Typography>
              )}
            </Box>

            {decidable && (
              // The card opens the step dialog, so a decision click must not
              // travel through to it.
              <Box
                className="gate-actions"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <ActionButtons
                  step={step}
                  busy={busy}
                  size="small"
                  compact={horizontal}
                  onAction={(a) => onAction(step, a)}
                />
              </Box>
            )}
          </Stack>

          <Typography
            sx={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '.08em', color, flexShrink: 0 }}
          >
            {horizontal ? String(step.step).padStart(2, '0') : `STATION ${String(step.step).padStart(2, '0')}`}
          </Typography>
        </Stack>

        <Tooltip title={`${String(step.step).padStart(2, '0')} · ${step.title}`}>
          <Typography
            component="h3"
            sx={{
              fontSize: horizontal ? 12.5 : 15,
              lineHeight: 1.35,
              fontWeight: 700,
              m: 0,
              color: status === 'upcoming' ? 'text.secondary' : 'text.primary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {step.title}
          </Typography>
        </Tooltip>

        {isGate ? (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box
              className={status === 'waiting' ? 'truck-pulse' : undefined}
              sx={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                bgcolor: status === 'cleared' ? tokens.pass : tokens.signal,
                flexShrink: 0,
                ...(status === 'waiting' && { animation: 'truckPulse 1.15s ease-in-out infinite' }),
              }}
            />
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 700,
                paddingLeft: 5,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: status === 'cleared' ? tokens.pass : tokens.signal,
              }}
            >
              {status === 'cleared' ? 'Approved' : 'Human input'}
            </Typography>
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {statusMeta[step.status].label}
          </Typography>
        )}

        {!horizontal && (
          <Chip
            size="small"
            label={statusMeta[step.status].label}
            sx={{
              alignSelf: 'flex-start',
              color,
              bgcolor: alpha(color, 0.1),
              border: `1px solid ${alpha(color, 0.3)}`,
              fontFamily: fonts.mono,
              fontSize: 9.5,
            }}
          />
        )}
      </Box>
    </Box>
  );

  return inspectable ? (
    card
  ) : (
    <Tooltip title="This step has not run yet — there is nothing to inspect">
      {/* A disabled element does not emit the events a tooltip listens for. */}
      <Box sx={{ display: 'contents' }}>{card}</Box>
    </Tooltip>
  );
}
