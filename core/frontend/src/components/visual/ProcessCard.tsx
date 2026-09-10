import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/CheckRounded';
import GavelIcon from '@mui/icons-material/Gavel';
import CloseIcon from '@mui/icons-material/CloseRounded';
import type { RunStep, StepAction } from '../../types/workflow';
import type { VisualVariant } from '../../data/visualVariants';
import { cardStyle } from '../../data/visualVariants';
import { fonts, statusMeta, tokens } from '../../theme';
import ActionButtons, { isInspectable } from '../dashboard/ActionButtons';
import MicroIndicator from './MicroIndicator';
import { cardFill, routeColor, routeStatus } from './routeStatus';

interface Props {
  step: RunStep;
  variant: VisualVariant;
  orientation: 'horizontal' | 'vertical';
  onInspect: (step: RunStep) => void;
  onAction: (step: RunStep, action: StepAction) => void;
  busy?: boolean;
}

/**
 * One step, drawn as a plain card.
 *
 * The shell is deliberately unremarkable: a single hairline stroke, a near-sharp
 * 3px radius, an opaque ground and a shadow you have to look for. Precision
 * reads as confidence, and a container that decorates itself — thick frames,
 * glass, a stack of offset rectangles — reads as one holding something together.
 * Depth is a single 8% layer beneath the card; the several processes inside a
 * step are drawn *within* the surface as micro indicators, never by multiplying
 * the surface.
 *
 * The one place that restraint gives way is the running step. A 24-step route is
 * mostly settled history and unstarted future with one or two steps actually
 * working, so the three states are weighted rather than merely tinted: the
 * running card is brighter, carries a wider rail with a travelling scan, and
 * lifts off the route; success is quiet and complete; upcoming recedes to a
 * dashed outline. Weight comes from contrast and motion — never from a thicker
 * border, which would undo the whole point.
 *
 * Every value above comes from `visualization.variants.<id>.card` in
 * config.json, so all of it is a JSON change.
 */
export default function ProcessCard({ step, variant, orientation, onInspect, onAction, busy }: Props) {
  const style = cardStyle(variant);
  const status = routeStatus(step);
  const color = routeColor(status, variant);
  const isGate = step.kind === 'GATE';
  const horizontal = orientation === 'horizontal';
  const decidable = isGate && step.status === 'AWAITING_APPROVAL';
  const inspectable = isInspectable(step);

  const running = status === 'moving';
  const cleared = status === 'cleared';
  const upcoming = status === 'upcoming';
  // Waiting and failed both need a person, so they carry the running step's
  // weight without its motion: nothing is progressing, and a card that animates
  // while stuck says the opposite of what is true.
  const emphatic = running || status === 'waiting' || status === 'failed';

  const railWidth = emphatic ? style.activeAccentWidth : style.accentWidth;
  const railOnLeft = style.accentEdge === 'left';
  const railOnTop = style.accentEdge === 'top';
  const scanning = running && style.activeAnimation === 'scan';
  const pulsing = running && style.activeAnimation === 'pulse';

  const border = `${style.borderWidth} ${upcoming ? style.upcomingBorderStyle : style.borderStyle} ${
    style.borderColor || alpha(color, running ? 0.55 : cleared ? 0.24 : upcoming ? 0.2 : 0.42)
  }`;

  const surface = cardFill(status, variant, style.background);

  const shadow = running
    ? style.activeShadow || `0 0 0 1px ${alpha(color, 0.3)}, 0 10px 24px ${alpha('#000', 0.45)}`
    : style.shadow;

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
      aria-current={running || status === 'waiting' ? 'step' : undefined}
      aria-label={`Step ${step.step}: ${step.title}, ${statusMeta[step.status].label}${
        inspectable ? '' : ' — not started, nothing to inspect'
      }`}
      sx={{
        position: 'relative',
        flex: '0 0 auto',
        width: horizontal ? 236 : '100%',
        maxWidth: horizontal ? 'none' : 370,
        minHeight: horizontal ? (decidable ? 156 : 132) : decidable ? 132 : 108,
        mx: horizontal ? 0 : 'auto',
        cursor: inspectable ? 'pointer' : 'default',
        // Settled and unstarted work stay legible without competing with the
        // step that is actually running.
        opacity: cleared ? style.completedOpacity : upcoming ? style.upcomingOpacity : 1,
        '&:focus-visible': { outline: `2px solid ${color}`, outlineOffset: 3 },
        '@keyframes processScanY': {
          from: { transform: 'translateY(-120%)' },
          to: { transform: 'translateY(240%)' },
        },
        '@keyframes processScanX': {
          from: { transform: 'translateX(-120%)' },
          to: { transform: 'translateX(240%)' },
        },
        '@keyframes processPulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
        '@media (prefers-reduced-motion: reduce)': {
          '& .process-motion': { animation: 'none !important' },
        },
      }}
    >
      {/* Depth is one layer, not a deck: a single offset ground at 8%. */}
      {style.depthLayer && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            inset: 0,
            transform: `translate(${style.depthOffset}, ${style.depthOffset})`,
            borderRadius: style.radius,
            bgcolor: color,
            opacity: style.depthOpacity,
            pointerEvents: 'none',
          }}
        />
      )}

      <Box
        sx={{
          position: 'relative',
          height: '100%',
          minHeight: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          border,
          borderRadius: style.radius,
          // Solid, never transparent: a ground that shows through reads as
          // unfinished, and the whole card is here to say the opposite.
          bgcolor: surface,
          boxShadow: shadow,
          overflow: 'hidden',
          p: horizontal ? '12px 14px 12px 18px' : '14px 16px 14px 20px',
          transition: 'box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease',
          ...(inspectable && {
            '&:hover': {
              boxShadow: running ? shadow : style.hoverShadow,
              borderColor: alpha(color, running ? 0.7 : 0.5),
              transform: 'translateY(-1px)',
            },
          }),
        }}
      >
        {/* The status rail: the one piece of colour that carries the state. */}
        {(railOnLeft || railOnTop) && (
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              ...(railOnLeft
                ? { left: 0, top: 0, bottom: 0, width: railWidth }
                : { left: 0, right: 0, top: 0, height: railWidth }),
              bgcolor: upcoming ? alpha(color, 0.45) : color,
              overflow: 'hidden',
              ...(pulsing && { animation: `processPulse ${style.activeAnimationMs}ms ease-in-out infinite` }),
            }}
            className={pulsing ? 'process-motion' : undefined}
          >
            {scanning && (
              <Box
                className="process-motion"
                sx={{
                  position: 'absolute',
                  ...(railOnLeft
                    ? { left: 0, right: 0, height: '45%' }
                    : { top: 0, bottom: 0, width: '45%' }),
                  // White rather than the palette: the rail is already the
                  // status colour, so a sweep in that same colour is invisible.
                  background: `linear-gradient(${
                    railOnLeft ? '180deg' : '90deg'
                  }, transparent, ${alpha('#fff', 0.85)}, transparent)`,
                  animation: `${railOnLeft ? 'processScanY' : 'processScanX'} ${
                    style.activeAnimationMs
                  }ms linear infinite`,
                }}
              />
            )}
          </Box>
        )}

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          {/* The step index, as a square: near-sharp geometry throughout, so
              nothing on the card contradicts the shell. */}
          <Box
            sx={{
              minWidth: 26,
              height: 22,
              px: 0.75,
              borderRadius: style.radius,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              // The running step is the only filled index on the route.
              color: running ? tokens.ink : color,
              bgcolor: running ? color : alpha(color, cleared ? 0.14 : 0.1),
              border: `1px solid ${alpha(color, running ? 0 : 0.32)}`,
            }}
          >
            {cleared ? (
              <CheckIcon sx={{ fontSize: 15 }} />
            ) : status === 'failed' ? (
              <CloseIcon sx={{ fontSize: 15 }} />
            ) : isGate ? (
              <GavelIcon sx={{ fontSize: 14 }} />
            ) : (
              <Typography
                sx={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  fontWeight: running ? 700 : 600,
                  lineHeight: 1,
                }}
              >
                {String(step.step).padStart(2, '0')}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            {/* One live dot, on the states where something is actually pending. */}
            {(running || status === 'waiting') && (
              <Box
                className="process-motion"
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: color,
                  flexShrink: 0,
                  animation: `processPulse ${running ? 1200 : 1600}ms ease-in-out infinite`,
                }}
              />
            )}
            <Typography
              sx={{
                fontFamily: fonts.mono,
                fontSize: 9.5,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                fontWeight: running ? 700 : 500,
                color: cleared || upcoming ? 'text.secondary' : color,
              }}
            >
              {statusMeta[step.status].label}
            </Typography>
          </Stack>
        </Stack>

        <Tooltip title={`${String(step.step).padStart(2, '0')} · ${step.title}`}>
          <Typography
            component="h3"
            sx={{
              fontSize: horizontal ? 13 : 15,
              lineHeight: 1.3,
              // The live step is the loudest text on the route.
              fontWeight: running ? 700 : 600,
              letterSpacing: running ? '0.005em' : 0,
              m: 0,
              color: upcoming ? 'text.secondary' : 'text.primary',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {step.title}
          </Typography>
        </Tooltip>

        <Box sx={{ mt: 'auto' }}>
          {decidable ? (
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
          ) : (
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between', minHeight: 12 }}
            >
              <MicroIndicator
                tasks={step.tasks}
                mode={style.indicator}
                status={status}
                color={color}
                muted={variant.palette.muted}
              />
              {isGate && (
                <Typography
                  sx={{
                    fontFamily: fonts.mono,
                    fontSize: 9.5,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    color: cleared ? tokens.pass : tokens.signal,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cleared ? 'Approved' : 'Human input'}
                </Typography>
              )}
            </Stack>
          )}
        </Box>

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
