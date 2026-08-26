import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import MinimizeIcon from '@mui/icons-material/Minimize';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  forwardRef,
  useId,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';

import type {
  GenericCardAppearanceConfig,
  GenericCardHeaderConfig,
  GenericCardProps,
  GenericCardStateConfig,
  GenericCardWindowControls,
} from './GenericCard.types';

const DEFAULT_APPEARANCE: Required<GenericCardAppearanceConfig> = {
  size: 'regular',
  surface: 'default',
  hoverAnimation: false,
  selected: false,
  responsive: true,
};

function useControllableBoolean(
  controlled: boolean | undefined,
  defaultValue: boolean,
  onChange: ((value: boolean) => void) | undefined,
): readonly [boolean, (value: boolean) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlled ?? internal;

  const setValue = (next: boolean) => {
    if (controlled === undefined) setInternal(next);
    if (next !== value) onChange?.(next);
  };

  return [value, setValue] as const;
}

function isInteractiveTarget(target: EventTarget | null, currentTarget: HTMLDivElement): boolean {
  return (
    target instanceof Element &&
    target !== currentTarget &&
    target.closest(
      'a, button, input, select, textarea, [role="button"], [contenteditable="true"]',
    ) !== null
  );
}

function WindowActions({
  config,
  minimized,
  fullScreen,
  setMinimized,
  setFullScreen,
}: {
  config: GenericCardWindowControls;
  minimized: boolean;
  fullScreen: boolean;
  setMinimized: (value: boolean) => void;
  setFullScreen: (value: boolean) => void;
}) {
  if (!config.minimizable && !config.fullscreenable) return null;

  const toggleMinimized = () => {
    const next = !minimized;
    if (next && fullScreen) setFullScreen(false);
    setMinimized(next);
  };

  const toggleFullScreen = () => {
    const next = !fullScreen;
    if (next && minimized) setMinimized(false);
    setFullScreen(next);
  };

  return (
    <Stack direction="row" spacing={0.25} alignItems="center">
      {config.minimizable && (
        <Tooltip title={minimized ? 'Restore card' : 'Minimize card'}>
          <IconButton
            size="small"
            aria-label={minimized ? 'Restore card' : 'Minimize card'}
            onClick={toggleMinimized}
          >
            <MinimizeIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {config.fullscreenable && (
        <Tooltip title={fullScreen ? 'Exit full screen' : 'Open full screen'}>
          <IconButton
            size="small"
            aria-label={fullScreen ? 'Exit full screen' : 'Open full screen'}
            onClick={toggleFullScreen}
          >
            {fullScreen ? (
              <FullscreenExitIcon fontSize="small" />
            ) : (
              <FullscreenIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}

function HeaderTitle({ header, titleId }: { header: GenericCardHeaderConfig; titleId: string }) {
  if (header.title === undefined && header.badge === undefined) return null;

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      {header.title !== undefined && (
        <Typography id={titleId} component="span" variant="h6">
          {header.title}
        </Typography>
      )}
      {header.badge}
    </Stack>
  );
}

function LoadingState({ rows }: { rows: number }) {
  return (
    <Stack spacing={1.25} aria-label="Loading card content" aria-busy="true">
      <Skeleton variant="rounded" height={28} width="42%" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="text" width={index === rows - 1 ? '68%' : '100%'} />
      ))}
    </Stack>
  );
}

function EmptyState({ state }: { state: GenericCardStateConfig }) {
  return (
    <Stack alignItems="center" textAlign="center" spacing={1} py={3} color="text.secondary">
      {state.emptyIcon ?? <InboxOutlinedIcon fontSize="large" aria-hidden="true" />}
      <Typography variant="subtitle1" color="text.primary">
        {state.emptyTitle ?? 'Nothing here yet'}
      </Typography>
      {state.emptyDescription !== undefined && (
        <Typography variant="body2">{state.emptyDescription}</Typography>
      )}
    </Stack>
  );
}

function ErrorState({ state }: { state: GenericCardStateConfig }) {
  return (
    <Alert
      severity="error"
      icon={<ErrorOutlineIcon fontSize="inherit" />}
      action={
        state.onRetry ? (
          <Button color="inherit" size="small" onClick={state.onRetry}>
            {state.retryLabel ?? 'Retry'}
          </Button>
        ) : undefined
      }
    >
      <Typography variant="subtitle2">{state.errorTitle ?? 'Unable to load'}</Typography>
      {state.error}
    </Alert>
  );
}

function resolveBody(
  state: GenericCardStateConfig,
  slots: GenericCardProps['slots'],
  children: ReactNode,
): ReactNode {
  if (state.loading) return slots?.loading ?? <LoadingState rows={state.loadingRows ?? 3} />;
  if (state.error !== undefined && state.error !== null) {
    return slots?.error ?? <ErrorState state={state} />;
  }
  if (state.empty) return slots?.empty ?? <EmptyState state={state} />;
  return slots?.body ?? children;
}

function buildCardSx(
  surface: Required<GenericCardAppearanceConfig>['surface'],
  hoverAnimation: boolean,
): SxProps<Theme> {
  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    ...(surface === 'subtle' && { bgcolor: 'action.hover' }),
    ...(surface === 'accent' && {
      color: 'common.white',
      background: (theme) =>
        glassIsEnabled(theme)
          ? theme.glass.accentGradient
          : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
      '& .MuiTypography-colorTextSecondary': { color: alpha('#ffffff', 0.78) },
    }),
    ...(surface === 'glass' && {
      bgcolor: (theme) =>
        glassIsEnabled(theme) ? theme.glass.surface : theme.palette.background.paper,
      backdropFilter: (theme) =>
        glassIsEnabled(theme) ? `blur(${theme.glass.blur}px) saturate(160%)` : 'none',
      border: (theme) =>
        `1px solid ${glassIsEnabled(theme) ? theme.glass.border : theme.palette.divider}`,
    }),
    // The glass themes lift and tilt every MuiCard on hover; cancel that back to
    // the resting state unless the caller opts into the motion.
    ...(hoverAnimation
      ? {}
      : {
          '&:hover': {
            transform: (theme: Theme) => (cardHoverIsThemed(theme) ? 'none' : undefined),
            boxShadow: (theme: Theme) =>
              cardHoverIsThemed(theme) ? theme.glass.shadow : undefined,
          },
        }),
  };
}

/**
 * The glass tokens are supplied by `AppThemeProvider`, so they are absent from a
 * bare MUI theme (isolated tests, previews). Every read goes through this guard
 * so an unwrapped render degrades to the plain surface instead of throwing.
 */
function glassIsEnabled(theme: Theme): boolean {
  return theme.glass?.enabled === true;
}

/** True when the active theme animates plain `MuiCard` surfaces on hover. */
function cardHoverIsThemed(theme: Theme): boolean {
  return glassIsEnabled(theme) && theme.glass.interactive3d;
}

/**
 * Reusable card shell. It renders generic visual/window behavior only; data
 * fetching, business actions, and multi-card coordination belong to parents.
 */
export const GenericCard = forwardRef<HTMLDivElement, GenericCardProps>(function GenericCard(
  {
    children,
    header = {},
    state = {},
    appearance: appearanceInput = {},
    windowControls = {},
    slots,
    onClick,
    onKeyDown,
    disabled = false,
    sx,
    ...cardProps
  },
  ref,
) {
  const appearance = { ...DEFAULT_APPEARANCE, ...appearanceInput };
  const [minimized, setMinimized] = useControllableBoolean(
    windowControls.minimized,
    windowControls.defaultMinimized ?? false,
    windowControls.onMinimizedChange,
  );
  const [fullScreen, setFullScreen] = useControllableBoolean(
    windowControls.fullScreen,
    windowControls.defaultFullScreen ?? false,
    windowControls.onFullScreenChange,
  );
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const clickable = onClick !== undefined;
  const hasStructuredHeader =
    header.title !== undefined ||
    header.subtitle !== undefined ||
    header.avatar !== undefined ||
    header.icon !== undefined ||
    header.action !== undefined ||
    header.badge !== undefined ||
    windowControls.minimizable === true ||
    windowControls.fullscreenable === true;

  const windowActions = (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {header.action}
      <WindowActions
        config={windowControls}
        minimized={minimized}
        fullScreen={fullScreen}
        setMinimized={setMinimized}
        setFullScreen={setFullScreen}
      />
    </Stack>
  );

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled || isInteractiveTarget(event.target, event.currentTarget)) return;
    onClick?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (
      event.defaultPrevented ||
      disabled ||
      !clickable ||
      event.target !== event.currentTarget ||
      (event.key !== 'Enter' && event.key !== ' ')
    ) {
      return;
    }
    event.preventDefault();
    event.currentTarget.click();
  };

  const contentPadding =
    appearance.size === 'compact' ? 1.5 : appearance.size === 'expanded' ? 3 : 2;
  const body = resolveBody(state, slots, children);
  const cardSx = buildCardSx(appearance.surface, appearance.hoverAnimation);

  return (
    <Box
      sx={[
        {
          position: fullScreen || minimized ? 'fixed' : 'relative',
          zIndex: fullScreen ? (theme) => theme.zIndex.modal + 1 : minimized ? 1200 : 'auto',
          ...(fullScreen
            ? { inset: { xs: 8, sm: 16 }, width: 'auto', height: 'auto' }
            : minimized
              ? {
                  right: windowControls.minimizedRight ?? 16,
                  bottom: windowControls.minimizedBottom ?? 16,
                  width: { xs: 'calc(100vw - 32px)', sm: 360 },
                }
              : {
                  width: appearance.responsive ? '100%' : 'fit-content',
                  minHeight: appearance.size === 'expanded' ? 320 : undefined,
                }),
          minWidth: fullScreen || minimized ? undefined : windowControls.minWidth,
          minHeight: fullScreen || minimized ? undefined : windowControls.minHeight,
          maxWidth: fullScreen || minimized ? undefined : windowControls.maxWidth,
          maxHeight: fullScreen || minimized ? undefined : windowControls.maxHeight,
          resize: windowControls.resizable && !fullScreen && !minimized ? 'both' : 'none',
          overflow: windowControls.resizable && !fullScreen && !minimized ? 'auto' : 'visible',
          opacity: disabled ? 0.55 : 1,
          transition: 'transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease',
          ...(appearance.hoverAnimation && !disabled && !fullScreen && !minimized
            ? {
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: (theme) => theme.shadows[8],
                },
              }
            : {}),
          ...(appearance.selected
            ? {
                borderRadius: 1,
                outline: (theme) => `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              }
            : {}),
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- MUI's SxProps array branch narrows through any.
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Card
        {...cardProps}
        ref={ref}
        sx={cardSx}
        role={clickable ? 'button' : cardProps.role}
        tabIndex={clickable && !disabled ? 0 : cardProps.tabIndex}
        aria-disabled={disabled || undefined}
        aria-pressed={clickable ? appearance.selected : undefined}
        aria-labelledby={header.title !== undefined ? titleId : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {slots?.header !== undefined ? (
          <Stack direction="row" alignItems="center" spacing={1} px={contentPadding} py={1}>
            <Box flexGrow={1} minWidth={0}>
              {slots.header}
            </Box>
            {windowActions}
          </Stack>
        ) : hasStructuredHeader ? (
          <CardHeader
            avatar={
              header.avatar ??
              (header.icon !== undefined ? (
                <Avatar aria-hidden="true">{header.icon}</Avatar>
              ) : undefined)
            }
            title={<HeaderTitle header={header} titleId={titleId} />}
            subheader={header.subtitle}
            action={windowActions}
            sx={{ px: contentPadding, py: appearance.size === 'compact' ? 1 : 1.5 }}
          />
        ) : null}

        {!minimized && (
          <>
            <CardContent
              sx={{
                p: contentPadding,
                pt: hasStructuredHeader || slots?.header !== undefined ? 0 : contentPadding,
                flexGrow: 1,
                overflow: fullScreen ? 'auto' : 'visible',
                '&:last-child': { pb: contentPadding },
              }}
            >
              {(header.description !== undefined || header.metric !== undefined) && (
                <Stack spacing={1} mb={body === undefined ? 0 : 2}>
                  {header.metric !== undefined && (
                    <Typography
                      variant={appearance.size === 'compact' ? 'h5' : 'h4'}
                      fontWeight={700}
                    >
                      {header.metric}
                    </Typography>
                  )}
                  {header.description !== undefined && (
                    <Typography variant="body2" color="text.secondary">
                      {header.description}
                    </Typography>
                  )}
                </Stack>
              )}
              {body}
            </CardContent>
            {slots?.footer !== undefined && (
              <CardActions sx={{ px: contentPadding, pb: contentPadding, pt: 0 }}>
                {slots.footer}
              </CardActions>
            )}
          </>
        )}
      </Card>
      {disabled && <Box position="absolute" sx={{ inset: 0 }} aria-hidden="true" />}
      {appearance.selected && !disabled && (
        <Box
          aria-hidden="true"
          position="absolute"
          borderRadius="inherit"
          sx={{
            inset: 0,
            pointerEvents: 'none',
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
          }}
        />
      )}
    </Box>
  );
});
