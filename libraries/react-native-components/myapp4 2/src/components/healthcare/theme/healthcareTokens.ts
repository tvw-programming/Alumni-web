/**
 * Healthcare domain tokens.
 *
 * The palette is deliberately calmer than the other domain libraries. Two rules
 * shaped it:
 *
 *   1. "Abnormal" is not "urgent". A lab value outside a reference range is
 *      common and usually not an emergency, so it must not look like one —
 *      `rangeOutside` is amber-ish, not red, and `urgentAccent` is reserved for
 *      states a clinician has explicitly marked urgent.
 *   2. No colour here carries meaning alone. Every use in this folder is paired
 *      with an icon and a word.
 */
import raw from '../../../../design-tokens/healthcare.tokens.json';

import { useThemeControl } from '@/theme';

export type HealthColorName = keyof typeof raw.color.light;

export interface HealthcareTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<HealthColorName, string>>;
  layout: {
    avatarSize: number;
    slotChipMinWidth: number;
    slotChipHeight: number;
    callControlSize: number;
    chatMaxWidthPercent: number;
    minTouchTarget: number;
  };
}

export const healthcareTokens = raw as unknown as HealthcareTokens;

export type HealthColors = Record<HealthColorName, string>;

export const useHealthTheme = (): { colors: HealthColors; layout: HealthcareTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: healthcareTokens.color[scheme], layout: healthcareTokens.layout };
};
