import { createTheme, alpha } from '@mui/material/styles';
import type { StepStatus, ComponentKind } from './types/workflow';

/**
 * Design tokens.
 *
 * The palette treats the app as an instrument panel for a supervised
 * autonomous system. Amber is the primary accent because the product's whole
 * premise is that two human decisions are structurally required — the colour
 * that means "a person must act" is the one that carries the identity.
 */
export const tokens = {
  ink: '#0F1117',
  panel: '#171A23',
  panelRaised: '#1D212C',
  rule: '#262A36',
  ruleStrong: '#333949',
  text: '#E6E8F0',
  muted: '#878DA3',
  faint: '#5C6178',

  signal: '#E8A33D', // amber — human gate, awaiting action
  pass: '#4FC3A1', // teal — success
  fail: '#F0616F', // rose — failed
  live: '#7C8CF8', // periwinkle — running
  idle: '#4A5063', // slate — pending
} as const;

export const fonts = {
  ui: '"Space Grotesk", "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
} as const;

/** One place decides what a status looks like, everywhere. */
export const statusMeta: Record<
  StepStatus,
  { label: string; color: string; short: string }
> = {
  SUCCESS: { label: 'Success', color: tokens.pass, short: 'OK' },
  APPROVED: { label: 'Approved', color: tokens.pass, short: 'OK' },
  RUNNING: { label: 'Running', color: tokens.live, short: 'RUN' },
  FAILED: { label: 'Failed', color: tokens.fail, short: 'ERR' },
  REJECTED: { label: 'Rejected', color: tokens.fail, short: 'REJ' },
  BLOCKED: { label: 'Blocked', color: tokens.signal, short: 'BLK' },
  AWAITING_APPROVAL: { label: 'Awaiting you', color: tokens.signal, short: 'YOU' },
  PENDING: { label: 'Pending', color: tokens.idle, short: '—' },
  // Amber rather than rose: nothing is broken, but it needs a person to
  // restart it — the same thing amber means at a gate.
  STALLED: { label: 'Stalled', color: tokens.signal, short: 'STL' },
  // Amber, like a gate: the run is waiting on a person, not on a fix.
  NEEDS_INPUT: { label: 'Needs your input', color: tokens.signal, short: 'ASK' },
  SKIPPED: { label: 'Skipped', color: tokens.faint, short: 'SKP' },
};

export const kindMeta: Record<ComponentKind, { label: string; hint: string }> = {
  AGENT: { label: 'Agent', hint: 'Model judgement — non-deterministic, costs tokens' },
  TOOL: { label: 'Tool', hint: 'Deterministic Python — same input, same output' },
  PLUGIN: { label: 'Plugin', hint: 'Adapter to an external system' },
  GATE: { label: 'Gate', hint: 'A human decides — the run blocks here' },
};

export const phases = [
  { id: 'requirements', label: 'Requirements', steps: [1, 2, 3, 4, 5] },
  { id: 'gate-brd', label: 'BRD approval', steps: [6] },
  { id: 'design', label: 'Design & scope', steps: [7, 8, 9, 10, 11] },
  { id: 'build', label: 'Build & verify', steps: [12, 13, 14, 15] },
  { id: 'validate', label: 'Validate', steps: [16, 17, 18, 19] },
  { id: 'publish', label: 'Document & publish', steps: [20, 21, 22, 23] },
  { id: 'gate-merge', label: 'Merge approval', steps: [24] },
] as const;

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'dark',
    primary: { main: tokens.signal, contrastText: '#1A1400' },
    secondary: { main: tokens.live },
    success: { main: tokens.pass },
    error: { main: tokens.fail },
    warning: { main: tokens.signal },
    info: { main: tokens.live },
    background: { default: tokens.ink, paper: tokens.panel },
    text: { primary: tokens.text, secondary: tokens.muted },
    divider: tokens.rule,
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: fonts.ui,
    h1: { fontFamily: fonts.ui, fontWeight: 600, fontSize: '1.75rem', letterSpacing: '-0.02em' },
    h2: { fontFamily: fonts.ui, fontWeight: 600, fontSize: '1.375rem', letterSpacing: '-0.015em' },
    h3: { fontFamily: fonts.ui, fontWeight: 600, fontSize: '1.125rem', letterSpacing: '-0.01em' },
    h4: { fontFamily: fonts.ui, fontWeight: 600, fontSize: '1rem' },
    h5: { fontFamily: fonts.ui, fontWeight: 600, fontSize: '0.9375rem' },
    h6: { fontFamily: fonts.ui, fontWeight: 600, fontSize: '0.875rem' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.65 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: 0 },
    caption: { fontFamily: fonts.mono, fontSize: '0.6875rem', letterSpacing: '0.04em' },
    overline: {
      fontFamily: fonts.mono,
      fontSize: '0.625rem',
      fontWeight: 600,
      letterSpacing: '0.14em',
      lineHeight: 1.6,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*, *::before, *::after': { boxSizing: 'border-box' },
        body: { backgroundColor: tokens.ink, WebkitFontSmoothing: 'antialiased' },
        '::selection': { background: alpha(tokens.signal, 0.28) },
        '::-webkit-scrollbar': { width: 10, height: 10 },
        '::-webkit-scrollbar-track': { background: tokens.ink },
        '::-webkit-scrollbar-thumb': {
          background: tokens.rule,
          borderRadius: 5,
          border: `2px solid ${tokens.ink}`,
        },
        '::-webkit-scrollbar-thumb:hover': { background: tokens.ruleStrong },
        '@media (prefers-reduced-motion: reduce)': {
          '*': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none', border: `1px solid ${tokens.rule}` },
      },
    },
    MuiCard: {
      styleOverrides: { root: { backgroundColor: tokens.panel } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, size: 'small' },
      styleOverrides: {
        root: { borderRadius: 5 },
        outlined: { borderColor: tokens.ruleStrong },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontFamily: fonts.mono, fontSize: '0.6875rem', fontWeight: 500 },
        sizeSmall: { height: 20 },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: {
          backgroundColor: tokens.panelRaised,
          border: `1px solid ${tokens.ruleStrong}`,
          fontSize: '0.75rem',
          maxWidth: 320,
          padding: '8px 10px',
        },
        arrow: { color: tokens.panelRaised },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          fontSize: '0.8125rem',
          '&:focus-visible': { outline: `2px solid ${tokens.signal}`, outlineOffset: -2 },
        },
      },
    },
    MuiDialog: {
      styleOverrides: { paper: { backgroundImage: 'none', border: `1px solid ${tokens.ruleStrong}` } },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { height: 3, borderRadius: 0, backgroundColor: tokens.rule } },
    },
  },
});

export default theme;
