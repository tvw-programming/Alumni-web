/**
 * Paper MD3 theme extended with our own namespaces.
 *
 * Components never import tokens directly — they call `useAppTheme()` and read
 * `theme.spacing.md`, `theme.motion.duration.fast`, `theme.colors.success`, …
 * That single indirection is what lets one component library serve many brands.
 */
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';
import { Easing, type EasingFunctionFactory } from 'react-native-reanimated';

import {
  tokens,
  type ColorScheme,
  type ColorTokenName,
  type DurationToken,
  type EasingToken,
  type SpringToken,
  type SpringConfigToken,
  type DesignTokens,
} from './tokens';

type SemanticColors = Record<ColorTokenName, string>;

export interface AppThemeExtras {
  spacing: DesignTokens['spacing'];
  radii: DesignTokens['radii'];
  sizing: DesignTokens['sizing'];
  typography: DesignTokens['typography'];
  elevationLevel: DesignTokens['elevation'];
  opacity: DesignTokens['opacity'];
  motion: {
    duration: Record<DurationToken, number>;
    easing: Record<EasingToken, EasingFunctionFactory>;
    spring: Record<SpringToken, SpringConfigToken>;
    stagger: { item: number; max: number };
  };
}

export type AppTheme = MD3Theme & AppThemeExtras & { colors: MD3Theme['colors'] & SemanticColors };

const toEasing = (source: DesignTokens['motion']['easing']): Record<EasingToken, EasingFunctionFactory> => {
  const entries = Object.entries(source) as Array<[EasingToken, readonly number[]]>;
  return entries.reduce((acc, [name, [a = 0, b = 0, c = 0, d = 1]]) => {
    acc[name] = Easing.bezier(a, b, c, d);
    return acc;
  }, {} as Record<EasingToken, EasingFunctionFactory>);
};

const extras: AppThemeExtras = {
  spacing: tokens.spacing,
  radii: tokens.radii,
  sizing: tokens.sizing,
  typography: tokens.typography,
  elevationLevel: tokens.elevation,
  opacity: tokens.opacity,
  motion: {
    duration: tokens.motion.duration,
    easing: toEasing(tokens.motion.easing),
    spring: tokens.motion.spring,
    stagger: tokens.motion.stagger,
  },
};

const buildTheme = (scheme: ColorScheme): AppTheme => {
  const base = scheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    ...extras,
    roundness: tokens.radii.md,
    colors: { ...base.colors, ...tokens.color[scheme] },
  };
};

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');

/**
 * Semantic intents are the vocabulary components speak. A component asks for
 * `intent="danger"`, never for `#BA1A1A`.
 */
export type Intent = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface IntentColors {
  main: string;
  on: string;
  container: string;
  onContainer: string;
}

const INTENT_TOKENS: Record<Intent, [ColorTokenName, ColorTokenName, ColorTokenName, ColorTokenName]> = {
  primary: ['primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer'],
  secondary: ['secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer'],
  success: ['success', 'onSuccess', 'successContainer', 'onSuccessContainer'],
  warning: ['warning', 'onWarning', 'warningContainer', 'onWarningContainer'],
  error: ['error', 'onError', 'errorContainer', 'onErrorContainer'],
  info: ['info', 'onInfo', 'infoContainer', 'onInfoContainer'],
  neutral: ['neutral', 'onNeutral', 'neutralContainer', 'onNeutralContainer'],
};

export const resolveIntent = (theme: AppTheme, intent: Intent): IntentColors => {
  const [main, on, container, onContainer] = INTENT_TOKENS[intent];
  return {
    main: theme.colors[main],
    on: theme.colors[on],
    container: theme.colors[container],
    onContainer: theme.colors[onContainer],
  };
};
