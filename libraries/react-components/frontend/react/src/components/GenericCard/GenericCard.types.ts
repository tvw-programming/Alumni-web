import type { CardProps } from '@mui/material/Card';
import type { MouseEventHandler, ReactNode } from 'react';

export type GenericCardSize = 'compact' | 'regular' | 'expanded';
export type GenericCardSurface = 'default' | 'subtle' | 'accent' | 'glass';

/** Structured header content. Use `slots.header` when completely custom markup is needed. */
export interface GenericCardHeaderConfig {
  title?: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  avatar?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  metric?: ReactNode;
  action?: ReactNode;
}

/** Mutually prioritized UI states: loading, error, empty, then normal content. */
export interface GenericCardStateConfig {
  loading?: boolean;
  loadingRows?: number;
  empty?: boolean;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  emptyIcon?: ReactNode;
  error?: ReactNode;
  errorTitle?: ReactNode;
  onRetry?: () => void;
  retryLabel?: ReactNode;
}

export interface GenericCardAppearanceConfig {
  size?: GenericCardSize;
  surface?: GenericCardSurface;
  /** Opt in to the lift-on-hover motion. Cards stay static by default. */
  hoverAnimation?: boolean;
  selected?: boolean;
  responsive?: boolean;
}

/**
 * Optional window-like behavior. Controlled values take precedence over their
 * default counterparts; callbacks let a parent coordinate multiple cards.
 */
export interface GenericCardWindowControls {
  minimizable?: boolean;
  minimized?: boolean;
  defaultMinimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
  fullscreenable?: boolean;
  fullScreen?: boolean;
  defaultFullScreen?: boolean;
  onFullScreenChange?: (fullScreen: boolean) => void;
  resizable?: boolean;
  minimizedBottom?: number | string;
  minimizedRight?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
}

/** Slots are the escape hatch for complete composition without adding one-off props. */
export interface GenericCardSlots {
  header?: ReactNode;
  body?: ReactNode;
  footer?: ReactNode;
  loading?: ReactNode;
  empty?: ReactNode;
  error?: ReactNode;
}

export interface GenericCardProps extends Omit<CardProps, 'children' | 'onClick'> {
  children?: ReactNode;
  header?: GenericCardHeaderConfig;
  state?: GenericCardStateConfig;
  appearance?: GenericCardAppearanceConfig;
  windowControls?: GenericCardWindowControls;
  slots?: GenericCardSlots;
  /** Makes the non-interactive card surface keyboard/click activatable. */
  onClick?: MouseEventHandler<HTMLDivElement>;
  disabled?: boolean;
}
