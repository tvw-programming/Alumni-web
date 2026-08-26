/**
 * Social and messaging domain tokens.
 *
 * The constraint that shaped this palette: reaction, unread, selected and
 * moderation states all have to survive being rendered in monochrome. Every
 * token below is paired with an icon, a label, or a shape wherever it is used —
 * a blue tint alone never means "unread", and a coloured ring alone never means
 * "unseen story".
 *
 * As in the other domain libraries, no component here accepts a hex value.
 */
import raw from '../../../../design-tokens/social.tokens.json';

import { useThemeControl } from '@/theme';

export type SocialColorName = keyof typeof raw.color.light;

export interface SocialTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<SocialColorName, string>>;
  layout: {
    avatarSm: number;
    avatarMd: number;
    avatarLg: number;
    avatarXl: number;
    storyRingSize: number;
    storyRingStroke: number;
    bubbleMaxWidthPercent: number;
    mediaTileGap: number;
    postMediaAspectRatio: number;
    coverAspectRatio: number;
    composerMinHeight: number;
  };
}

export const socialTokens = raw as unknown as SocialTokens;

export type SocialColors = Record<SocialColorName, string>;

export const useSocialTheme = (): { colors: SocialColors; layout: SocialTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: socialTokens.color[scheme], layout: socialTokens.layout };
};
