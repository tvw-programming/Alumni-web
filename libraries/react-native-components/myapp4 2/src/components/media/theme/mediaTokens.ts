/**
 * Media & OTT domain tokens.
 *
 * The constraint that shaped this palette: restricted, downloaded and error
 * states must survive monochrome and a glance, and no brand colour (Netflix
 * red, Disney blue) is hard-coded anywhere in the component layer — every
 * accent here is a semantic token a consumer app re-themes through
 * `PaperProvider`.
 */
import raw from '../../../../design-tokens/media.tokens.json';

import { useThemeControl } from '@/theme';

export type MediaColorName = keyof typeof raw.color.light;

export interface MediaTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<MediaColorName, string>>;
  layout: {
    posterPortraitRatio: number;
    posterLandscapeRatio: number;
    heroHeight: number;
    carouselCardGap: number;
    episodeThumbWidth: number;
    castAvatarSize: number;
    miniPlayerHeight: number;
  };
}

export const mediaTokens = raw as unknown as MediaTokens;

export type MediaColors = Record<MediaColorName, string>;

export const useStreamingTheme = (): { colors: MediaColors; layout: MediaTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: mediaTokens.color[scheme], layout: mediaTokens.layout };
};
