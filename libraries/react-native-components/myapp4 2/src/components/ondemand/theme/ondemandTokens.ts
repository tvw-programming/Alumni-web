/**
 * Delivery and home-service domain tokens.
 *
 * The constraint that shaped this palette: assignment, arrival and cancellation
 * states must survive monochrome and a glance. Every token below is paired with
 * an icon and a word wherever it is used — a blue dot alone never means
 * "en route", and a red total alone never means "cancellation fee".
 */
import raw from '../../../../design-tokens/ondemand.tokens.json';

import { useThemeControl } from '@/theme';

export type OnDemandColorName = keyof typeof raw.color.light;

export interface OnDemandTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<OnDemandColorName, string>>;
  layout: {
    categoryTileSize: number;
    providerAvatarSize: number;
    agentAvatarSize: number;
    mapPreviewHeight: number;
    slotChipMinWidth: number;
    otpDigitSize: number;
  };
}

export const ondemandTokens = raw as unknown as OnDemandTokens;

export type OnDemandColors = Record<OnDemandColorName, string>;

export const useServiceTheme = (): { colors: OnDemandColors; layout: OnDemandTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: ondemandTokens.color[scheme], layout: ondemandTokens.layout };
};
