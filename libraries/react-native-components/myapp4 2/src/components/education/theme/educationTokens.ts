/**
 * Education domain tokens.
 *
 * One set supports two moods: `reward.*` and `streak.*` carry the playful
 * character a language app wants, while everything else stays restrained enough
 * for academic or professional training. Products pick a mood by choosing which
 * components they compose, not by swapping palettes.
 *
 * As in the other domain libraries, no component here accepts a hex value.
 */
import raw from '../../../../design-tokens/education.tokens.json';

import { useThemeControl } from '@/theme';

export type EducationColorName = keyof typeof raw.color.light;

export interface EducationTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<EducationColorName, string>>;
  layout: {
    courseMediaAspectRatio: number;
    progressRingSize: number;
    progressRingStroke: number;
    progressBarHeight: number;
    lessonRowHeight: number;
    badgeSize: number;
    flashCardMinHeight: number;
    playerControlSize: number;
  };
}

export const educationTokens = raw as unknown as EducationTokens;

export type EducationColors = Record<EducationColorName, string>;

export const useLearnTheme = (): { colors: EducationColors; layout: EducationTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: educationTokens.color[scheme], layout: educationTokens.layout };
};
