/**
 * E-commerce domain tokens.
 *
 * Same contract as the fintech tokens: semantic names only, and every one of
 * these colours is paired with an icon or a word at the point of use. Nothing
 * in this folder accepts a hex value.
 */
import raw from '../../../../design-tokens/ecommerce.tokens.json';

import { useThemeControl } from '@/theme';

export type EcommerceColorName = keyof typeof raw.color.light;

export interface EcommerceTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<EcommerceColorName, string>>;
  layout: {
    productMediaAspectRatio: number;
    fashionMediaAspectRatio: number;
    gridCardMinWidth: number;
    listCardMediaSize: number;
    swatchSize: number;
    thumbnailSize: number;
    titleLines: number;
  };
}

export const ecommerceTokens = raw as unknown as EcommerceTokens;

export type EcommerceColors = Record<EcommerceColorName, string>;

export const useShopTheme = (): { colors: EcommerceColors; layout: EcommerceTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: ecommerceTokens.color[scheme], layout: ecommerceTokens.layout };
};
