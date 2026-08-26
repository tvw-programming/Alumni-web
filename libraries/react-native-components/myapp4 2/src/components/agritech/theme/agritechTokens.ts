/**
 * AgriTech & logistics / supply chain domain tokens.
 *
 * The constraint that shaped this palette: crop stage, market delta,
 * nutrient status, advisory severity, shipment state, stock health, and
 * live-tracking freshness must all survive monochrome and a glance — every
 * colour here is a semantic token a consuming app re-themes through
 * `PaperProvider`, never a hard-coded brand green.
 */
import raw from '../../../../design-tokens/agritech.tokens.json';

import { useThemeControl } from '@/theme';

export type AgritechColorName = keyof typeof raw.color.light;

export interface AgritechTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<AgritechColorName, string>>;
  layout: {
    forecastCardWidth: number;
    mapPreviewHeight: number;
    scannerFrameSize: number;
  };
}

export const agritechTokens = raw as unknown as AgritechTokens;

export type AgritechColors = Record<AgritechColorName, string>;

export const useAgriLogisticsTheme = (): { colors: AgritechColors; layout: AgritechTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: agritechTokens.color[scheme], layout: agritechTokens.layout };
};
