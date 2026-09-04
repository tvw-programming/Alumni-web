/**
 * Fintech domain tokens.
 *
 * These sit on top of the app theme rather than replacing it: the base library
 * owns spacing/radii/motion, this file owns the financial semantics
 * (`amount.debit`, `status.pending`, `privacy.mask`, chart series, …).
 *
 * The rule from the spec holds — product teams pick a *semantic* name, never a
 * color. There is no prop anywhere in this folder that accepts a hex value.
 */
import raw from '../../../../design-tokens/fintech.tokens.json';

import { useThemeControl } from '@/theme';

export type FintechColorName = keyof typeof raw.color.light;

export interface FintechTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<FintechColorName, string>>;
  layout: {
    cardAspectRatio: number;
    keypadKeyHeight: number;
    keypadGap: number;
    amountDisplayHeight: number;
    donutStrokeWidth: number;
  };
}

export const fintechTokens = raw as unknown as FintechTokens;

export type FintechColors = Record<FintechColorName, string>;

/** Companion to `useAppTheme()` — same idea, financial vocabulary. */
export const useFintechTheme = (): { colors: FintechColors; layout: FintechTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: fintechTokens.color[scheme], layout: fintechTokens.layout };
};

/** Ordered chart series. Stable across the product so users learn the mapping. */
export const CHART_SERIES: FintechColorName[] = [
  'chart1',
  'chart2',
  'chart3',
  'chart4',
  'chart5',
  'chart6',
  'chart7',
];
