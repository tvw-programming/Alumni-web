/**
 * Theme system — shared types.
 *
 * One source of truth for every value the theme system deals with:
 * mode, style, user-selected colors, and the custom glass tokens that
 * are attached to the MUI theme via module augmentation.
 */

/** Light / dark palette mode (maps 1:1 to MUI `palette.mode`). */
export type ThemeMode = 'light' | 'dark';

/**
 * Visual style: plain solid colors, gradient glassmorphism, or the
 * 3D Gradient Glass look (multi-color radial background, frosted surfaces,
 * 3D hover lift on cards — ported from the CodeGen project).
 */
export type ThemeStyle = 'plain' | 'glass' | 'glass3d';

/** User-configurable theme settings. Persisted to localStorage. */
export interface ThemeSettings {
  readonly mode: ThemeMode;
  readonly style: ThemeStyle;
  /** Hex color, e.g. "#1e5aa8". Drives `palette.primary`. */
  readonly primaryColor: string;
  /** Hex color, e.g. "#f0a03c". Drives `palette.secondary`. */
  readonly secondaryColor: string;
}

/**
 * Design tokens for the gradient-glass style. Computed once by the theme
 * factory and exposed on the theme (`theme.glass`) so component overrides
 * and app code never hardcode glass values.
 */
export interface GlassTokens {
  /** Whether glass styling is active (false in plain style). */
  readonly enabled: boolean;
  /** Backdrop blur radius in px. */
  readonly blur: number;
  /** Translucent surface color for Paper/Card. */
  readonly surface: string;
  /** More opaque surface for AppBar/Drawer/Dialog/Snackbar (readability). */
  readonly surfaceStrong: string;
  /** Translucent background for text inputs. */
  readonly input: string;
  /** Subtle 1px border color for glass surfaces. */
  readonly border: string;
  /** Full-page background gradient (applied to <body>). */
  readonly pageGradient: string;
  /** Primary→secondary accent gradient (contained buttons etc.). */
  readonly accentGradient: string;
  /** Soft elevated shadow for card-like glass surfaces. */
  readonly shadow: string;
  /** 3D hover lift on cards (glass3d style only). */
  readonly interactive3d: boolean;
  /** Deeper shadow shown while a card is 3D-lifted. */
  readonly hoverShadow: string;
}

/** Static, non-user-configurable theme configuration. */
export interface ThemeConfig {
  readonly storageKey: string;
  readonly borderRadius: number;
  readonly defaults: ThemeSettings;
  readonly presetPrimaryColors: readonly string[];
  readonly presetSecondaryColors: readonly string[];
}

/* ------------------------------------------------------------------ */
/* MUI module augmentation: custom properties available on the theme. */
/* ------------------------------------------------------------------ */
declare module '@mui/material/styles' {
  interface Theme {
    /** Active visual style ('plain' | 'glass' | 'glass3d'). */
    appStyle: ThemeStyle;
    /** Glass design tokens (inert when appStyle === 'plain'). */
    glass: GlassTokens;
  }
  interface ThemeOptions {
    appStyle?: ThemeStyle;
    glass?: GlassTokens;
  }
}
