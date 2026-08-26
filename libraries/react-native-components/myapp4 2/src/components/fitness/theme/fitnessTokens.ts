/**
 * Fitness & wellness domain tokens.
 *
 * The constraint that shaped this palette: ring, streak, and completion
 * states must survive monochrome and a glance, and ring colours are our own
 * semantic tokens — never a reuse of any platform's exact ring identity.
 */
import raw from '../../../../design-tokens/fitness.tokens.json';

import { useThemeControl } from '@/theme';

export type FitnessColorName = keyof typeof raw.color.light;

export interface FitnessTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<FitnessColorName, string>>;
  layout: {
    ringSizeSmall: number;
    ringSizeLarge: number;
    restTimerSize: number;
    waterGlassSize: number;
    exerciseThumbSize: number;
  };
}

export const fitnessTokens = raw as unknown as FitnessTokens;

export type FitnessColors = Record<FitnessColorName, string>;

export const useWellnessTheme = (): { colors: FitnessColors; layout: FitnessTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: fitnessTokens.color[scheme], layout: fitnessTokens.layout };
};
