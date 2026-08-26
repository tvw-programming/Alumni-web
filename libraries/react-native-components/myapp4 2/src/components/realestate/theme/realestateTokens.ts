/**
 * Real estate & PropTech domain tokens.
 *
 * The constraint that shaped this palette: sold/rented uses a neutral grey,
 * not alarm red, per the spec — status treatment stays muted and scannable
 * rather than urgent. Every status is paired with an icon and a word
 * wherever it's rendered; colour never carries meaning alone.
 */
import raw from '../../../../design-tokens/realestate.tokens.json';

import { useThemeControl } from '@/theme';

export type RealEstateColorName = keyof typeof raw.color.light;

export interface RealEstateTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<RealEstateColorName, string>>;
  layout: {
    cardImageHeight: number;
    galleryThumbSize: number;
    agentAvatarSize: number;
    amenityIconSize: number;
  };
}

export const realestateTokens = raw as unknown as RealEstateTokens;

export type RealEstateColors = Record<RealEstateColorName, string>;

export const usePropertyTheme = (): { colors: RealEstateColors; layout: RealEstateTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: realestateTokens.color[scheme], layout: realestateTokens.layout };
};
