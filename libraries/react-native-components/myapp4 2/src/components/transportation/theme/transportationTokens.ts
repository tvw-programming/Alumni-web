/**
 * Transportation and ride-hailing domain tokens.
 *
 * The constraint that shaped this palette: ride status, safety and OTP states
 * must survive monochrome and a glance. Every token below is paired with an
 * icon and a word wherever it is used — a blue dot alone never means "driver
 * arriving", and a red icon alone never means "emergency".
 */
import raw from '../../../../design-tokens/transportation.tokens.json';

import { useThemeControl } from '@/theme';

export type TransportationColorName = keyof typeof raw.color.light;

export interface TransportationTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<TransportationColorName, string>>;
  layout: {
    rideCardMinWidth: number;
    driverAvatarSize: number;
    otpDigitSize: number;
    mapPreviewHeight: number;
    timelineNodeSize: number;
  };
}

export const transportationTokens = raw as unknown as TransportationTokens;

export type TransportationColors = Record<TransportationColorName, string>;

export const useRideTheme = (): { colors: TransportationColors; layout: TransportationTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: transportationTokens.color[scheme], layout: transportationTokens.layout };
};
