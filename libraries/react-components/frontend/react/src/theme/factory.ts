import {
  alpha,
  createTheme,
  darken,
  lighten,
  type PaletteOptions,
  type Theme,
  type ThemeOptions,
} from '@mui/material/styles';

import { THEME_CONFIG } from './config';

import type { GlassTokens, ThemeMode, ThemeSettings, ThemeStyle } from './types';

/**
 * Theme factory.
 *
 * `createAppTheme(settings)` produces a complete, self-consistent MUI theme
 * from the four user-selectable inputs (mode, style, primary, secondary).
 *
 * Two-pass construction:
 *   1. Build the base theme (palette, shape, typography, custom tokens).
 *   2. Build component overrides that read tokens from the base theme, so
 *      overrides never hardcode colors.
 */

/* ------------------------------- tokens -------------------------------- */

const INERT_GLASS: GlassTokens = {
  enabled: false,
  blur: 0,
  surface: 'transparent',
  surfaceStrong: 'transparent',
  input: 'transparent',
  border: 'transparent',
  pageGradient: 'none',
  accentGradient: 'none',
  shadow: 'none',
  interactive3d: false,
  hoverShadow: 'none',
};

/** Corner radius for the 3D Gradient Glass style (CodeGen reference: 18). */
const GLASS_3D_RADIUS = 18;

/** Third accent for the tri-color radial background (CodeGen teal). */
const GLASS_3D_TERTIARY = '#18c2c2';

function buildGlassTokens(mode: ThemeMode, primary: string, secondary: string): GlassTokens {
  const accentGradient = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;

  if (mode === 'light') {
    return {
      enabled: true,
      blur: 14,
      surface: alpha('#ffffff', 0.6),
      surfaceStrong: alpha('#ffffff', 0.82),
      input: alpha('#ffffff', 0.55),
      border: alpha('#ffffff', 0.65),
      pageGradient: `linear-gradient(135deg, ${lighten(primary, 0.85)} 0%, ${lighten(
        secondary,
        0.82,
      )} 50%, ${lighten(primary, 0.9)} 100%)`,
      accentGradient,
      shadow: '0 8px 32px rgba(31, 38, 90, 0.14)',
      interactive3d: false,
      hoverShadow: 'none',
    };
  }
  return {
    enabled: true,
    blur: 14,
    surface: alpha('#ffffff', 0.06),
    surfaceStrong: alpha('#141a26', 0.78),
    input: alpha('#ffffff', 0.05),
    border: alpha('#ffffff', 0.12),
    pageGradient: `linear-gradient(135deg, ${darken(primary, 0.72)} 0%, #0c1017 45%, ${darken(
      secondary,
      0.74,
    )} 100%)`,
    accentGradient,
    shadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
    interactive3d: false,
    hoverShadow: 'none',
  };
}

/**
 * "3D Gradient Glass" tokens, ported from the CodeGen project
 * (src/app/theme/glass.ts): a tri-color radial-gradient page background,
 * stronger frosted surfaces (16px blur, translucent white fill, soft white
 * border), and a 3D hover lift on cards. Colors follow the user-selected
 * primary/secondary instead of CodeGen's hardcoded violet/pink.
 */
function buildGlass3dTokens(mode: ThemeMode, primary: string, secondary: string): GlassTokens {
  const accentGradient = `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`;

  if (mode === 'light') {
    return {
      enabled: true,
      blur: 16,
      surface: alpha('#ffffff', 0.55),
      surfaceStrong: alpha('#ffffff', 0.8),
      input: alpha('#ffffff', 0.5),
      border: alpha('#ffffff', 0.7),
      pageGradient:
        `radial-gradient(circle at 18% 18%, ${lighten(primary, 0.55)} 0%, transparent 42%),` +
        `radial-gradient(circle at 82% 12%, ${lighten(secondary, 0.55)} 0%, transparent 40%),` +
        `radial-gradient(circle at 50% 92%, ${lighten(GLASS_3D_TERTIARY, 0.55)} 0%, transparent 45%),` +
        `linear-gradient(135deg, ${lighten(primary, 0.88)} 0%, ${lighten(secondary, 0.9)} 55%, ${lighten(primary, 0.92)} 100%)`,
      accentGradient,
      shadow: '0 8px 32px rgba(31, 38, 90, 0.18)',
      interactive3d: true,
      hoverShadow: '0 18px 48px rgba(31, 38, 90, 0.28)',
    };
  }
  return {
    enabled: true,
    blur: 16,
    surface: 'rgba(255, 255, 255, 0.10)',
    surfaceStrong: 'rgba(20, 26, 38, 0.82)',
    input: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.22)',
    pageGradient:
      `radial-gradient(circle at 18% 18%, ${darken(primary, 0.1)} 0%, transparent 42%),` +
      `radial-gradient(circle at 82% 12%, ${darken(secondary, 0.1)} 0%, transparent 40%),` +
      `radial-gradient(circle at 50% 92%, ${GLASS_3D_TERTIARY} 0%, transparent 45%),` +
      'linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%)',
    accentGradient,
    shadow: '0 8px 32px rgba(15, 23, 42, 0.28)',
    interactive3d: true,
    hoverShadow: '0 18px 48px rgba(15, 23, 42, 0.45)',
  };
}

/* ------------------------------- palette ------------------------------- */

function buildPalette(mode: ThemeMode, style: ThemeStyle, settings: ThemeSettings): PaletteOptions {
  // `main`-only inputs let MUI derive light/dark/contrastText with
  // accessible contrast automatically (augmentColor).
  const shared: PaletteOptions = {
    mode,
    primary: { main: settings.primaryColor },
    secondary: { main: settings.secondaryColor },
  };

  const isGlass = style !== 'plain';

  if (mode === 'light') {
    return {
      ...shared,
      // In glass styles these are solid fallbacks that roughly match the
      // gradient average — surfaces themselves become translucent via
      // component overrides.
      background: isGlass
        ? { default: '#eef1f8', paper: '#ffffff' }
        : { default: '#f5f7fa', paper: '#ffffff' },
      text: { primary: '#1a2027', secondary: '#4b5563' },
      divider: isGlass ? alpha('#1a2027', 0.1) : 'rgba(0, 0, 0, 0.12)',
    };
  }
  return {
    ...shared,
    background: isGlass
      ? style === 'glass3d'
        ? { default: '#0f172a', paper: '#141a26' }
        : { default: '#0c1017', paper: '#141a26' }
      : { default: '#0f1115', paper: '#171b21' },
    text: { primary: '#f2f5f9', secondary: '#a8b3c1' },
    divider: alpha('#ffffff', 0.12),
  };
}

/* --------------------------- component overrides ------------------------ */

function buildComponents(theme: Theme): ThemeOptions['components'] {
  const { glass, palette, appStyle } = theme;
  const isGlass = appStyle !== 'plain';
  const blur = `blur(${glass.blur}px) saturate(160%)`;

  const glassSurface = {
    backgroundColor: glass.surface,
    backgroundImage: 'none',
    backdropFilter: blur,
    WebkitBackdropFilter: blur,
    border: `1px solid ${glass.border}`,
  } as const;

  const glassSurfaceStrong = {
    ...glassSurface,
    backgroundColor: glass.surfaceStrong,
  } as const;

  return {
    MuiCssBaseline: {
      styleOverrides: {
        body: isGlass
          ? {
              background: glass.pageGradient,
              backgroundAttachment: 'fixed',
              minHeight: '100vh',
            }
          : {
              backgroundColor: palette.background.default,
            },
      },
    },

    MuiAppBar: {
      defaultProps: { elevation: isGlass ? 0 : 1 },
      styleOverrides: {
        root: isGlass
          ? {
              backdropFilter: blur,
              WebkitBackdropFilter: blur,
              borderBottom: `1px solid ${glass.border}`,
            }
          : {},
        colorPrimary: isGlass
          ? {
              backgroundColor: glass.surfaceStrong,
              backgroundImage: 'none',
              color: palette.text.primary,
            }
          : {},
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: isGlass
          ? {
              ...glassSurfaceStrong,
              borderTop: 'none',
              borderBottom: 'none',
            }
          : {
              backgroundColor: palette.background.paper,
              backgroundImage: 'none',
            },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: isGlass
          ? glassSurface
          : {
              backgroundImage: 'none',
            },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: isGlass
          ? {
              boxShadow: glass.shadow,
              // 3D Gradient Glass: cards lift and tilt on hover (CodeGen's
              // GlassCard interactive behavior).
              ...(glass.interactive3d
                ? {
                    transformStyle: 'preserve-3d' as const,
                    transition: 'transform 220ms ease, box-shadow 220ms ease',
                    '&:hover': {
                      transform: 'translateY(-6px) rotateX(4deg) rotateY(-4deg)',
                      boxShadow: glass.hoverShadow,
                    },
                  }
                : {}),
            }
          : {
              border: `1px solid ${palette.divider}`,
              boxShadow: 'none',
            },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: theme.shape.borderRadius,
        },
        containedPrimary: isGlass
          ? {
              backgroundImage: glass.accentGradient,
              // Keep text on the gradient readable: primary contrastText is
              // computed by MUI for the primary main color.
              color: palette.primary.contrastText,
              '&:hover': {
                backgroundImage: glass.accentGradient,
                filter: 'brightness(1.08)',
              },
              '&.Mui-disabled': {
                backgroundImage: 'none',
              },
            }
          : {},
      },
    },

    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: isGlass
          ? {
              backgroundColor: glass.input,
              backdropFilter: `blur(${glass.blur / 2}px)`,
              WebkitBackdropFilter: `blur(${glass.blur / 2}px)`,
            }
          : {},
        notchedOutline: isGlass
          ? {
              borderColor: glass.border,
            }
          : {},
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: isGlass
          ? {
              ...glassSurfaceStrong,
              boxShadow: glass.shadow,
            }
          : {},
      },
    },

    MuiSnackbarContent: {
      styleOverrides: {
        root: isGlass
          ? {
              ...glassSurfaceStrong,
              color: palette.text.primary,
              boxShadow: glass.shadow,
            }
          : {},
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: isGlass
          ? {
              backgroundColor: glass.surfaceStrong,
              color: palette.text.primary,
              backdropFilter: blur,
              WebkitBackdropFilter: blur,
              border: `1px solid ${glass.border}`,
            }
          : {},
      },
    },
  };
}

/* -------------------------------- factory ------------------------------- */

export function createAppTheme(settings: ThemeSettings): Theme {
  const { mode, style } = settings;

  const base = createTheme({
    breakpoints: {
      values: {
        xs: 0,
        sm: 600,
        md: 960,
        lg: 1400, // Changes 'lg' from 1200px to 1400px
        xl: 1600,
      },
    },
    palette: buildPalette(mode, style, settings),
    // 3D Gradient Glass uses the larger CodeGen corner radius.
    shape: { borderRadius: style === 'glass3d' ? GLASS_3D_RADIUS : THEME_CONFIG.borderRadius },
    typography: {
      fontFamily:
        '"Inter", "Roboto", "Helvetica Neue", "Segoe UI", system-ui, -apple-system, sans-serif',
      button: { textTransform: 'none' },
    },
    appStyle: style,
    glass:
      style === 'glass3d'
        ? buildGlass3dTokens(mode, settings.primaryColor, settings.secondaryColor)
        : style === 'glass'
          ? buildGlassTokens(mode, settings.primaryColor, settings.secondaryColor)
          : INERT_GLASS,
  });

  return createTheme(base, { components: buildComponents(base) });
}
