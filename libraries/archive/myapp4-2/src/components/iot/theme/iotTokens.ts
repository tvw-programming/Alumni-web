/**
 * IoT / smart home / wearables domain tokens.
 *
 * The constraint that shaped this palette: connection, power, and command
 * states must survive monochrome and a glance, and no brand-specific
 * accent (Hue orange, SmartThings green) is hard-coded — every colour here
 * is a semantic token a consuming app re-themes through `PaperProvider`.
 */
import raw from '../../../../design-tokens/iot.tokens.json';

import { useThemeControl } from '@/theme';

export type IotColorName = keyof typeof raw.color.light;

export interface IotTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<IotColorName, string>>;
  layout: {
    tileSize: number;
    dialSize: number;
    colorWheelSize: number;
    deviceIconSize: number;
  };
}

export const iotTokens = raw as unknown as IotTokens;

export type IotColors = Record<IotColorName, string>;

export const useSmartHomeTheme = (): { colors: IotColors; layout: IotTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: iotTokens.color[scheme], layout: iotTokens.layout };
};
