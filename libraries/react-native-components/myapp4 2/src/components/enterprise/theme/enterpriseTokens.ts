/**
 * Enterprise / B2B / productivity domain tokens.
 *
 * The constraint that shaped this palette: priority, status, unread and
 * audit-severity states must survive monochrome and a glance. Every status
 * below is paired with an icon and a word wherever it is rendered — colour
 * never carries meaning alone in a workspace product.
 */
import raw from '../../../../design-tokens/enterprise.tokens.json';

import { useThemeControl } from '@/theme';

export type EnterpriseColorName = keyof typeof raw.color.light;

export interface EnterpriseTokens {
  brand: string;
  color: Record<'light' | 'dark', Record<EnterpriseColorName, string>>;
  layout: {
    avatarSize: number;
    kpiSparklineHeight: number;
    kanbanColumnWidth: number;
  };
}

export const enterpriseTokens = raw as unknown as EnterpriseTokens;

export type EnterpriseColors = Record<EnterpriseColorName, string>;

export const useWorkspaceTheme = (): { colors: EnterpriseColors; layout: EnterpriseTokens['layout'] } => {
  const { scheme } = useThemeControl();
  return { colors: enterpriseTokens.color[scheme], layout: enterpriseTokens.layout };
};
