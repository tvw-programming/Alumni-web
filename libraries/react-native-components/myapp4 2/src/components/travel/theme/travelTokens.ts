/**
 * Travel, hospitality and booking domain tokens.
 *
 * The constraint that shaped this palette: price, availability, cancellation
 * and data-freshness states must survive monochrome and a glance. Every token
 * below is paired with an icon and a word wherever it is used — a green price
 * alone never means "cheapest", and a red total alone never means
 * "nonrefundable".
 */
import raw from '../../../../design-tokens/travel.tokens.json';

import { useThemeControl } from '@/theme';

export type TravelColorName = keyof typeof raw.color.light;

export interface TravelTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<TravelColorName, string>>;
  layout: {
    propertyImageHeight: number;
    propertyThumbSize: number;
    amenityIconSize: number;
    calendarCellMinWidth: number;
    ticketBarcodeSize: number;
    timelineNodeSize: number;
  };
}

export const travelTokens = raw as unknown as TravelTokens;

export type TravelColors = Record<TravelColorName, string>;

export const useTravelTheme = (): { colors: TravelColors; layout: TravelTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: travelTokens.color[scheme], layout: travelTokens.layout };
};
