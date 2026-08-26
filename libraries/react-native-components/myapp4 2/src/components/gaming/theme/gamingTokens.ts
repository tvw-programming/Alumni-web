/**
 * Gaming domain tokens.
 *
 * The constraint that shaped this palette: rarity, ownership and claim states
 * must survive monochrome and a glance. Every token below is paired with an
 * icon and a word wherever it is used — a gold border alone never means
 * "legendary", and a green dot alone never means "earned".
 */
import raw from '../../../../design-tokens/gaming.tokens.json';

import { useThemeControl } from '@/theme';

export type GamingColorName = keyof typeof raw.color.light;

export interface GamingTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<GamingColorName, string>>;
  layout: {
    coverAspectRatio: number;
    avatarSize: number;
    podiumAvatarSize: number;
    badgeIconSize: number;
    wheelSize: number;
  };
}

export const gamingTokens = raw as unknown as GamingTokens;

export type GamingColors = Record<GamingColorName, string>;

export const useGameTheme = (): { colors: GamingColors; layout: GamingTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: gamingTokens.color[scheme], layout: gamingTokens.layout };
};
