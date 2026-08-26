import React from 'react';
import { Chip, Icon } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { RoleTone } from '../types/domain';

export interface UserRoleChipProps extends StyleEscapeHatches {
  role: string;
  tone?: RoleTone;
  icon?: string;
  onPress?: () => void;
}

const TONE_ICON: Record<RoleTone, string> = {
  neutral: 'account-outline',
  admin: 'shield-crown-outline',
  manager: 'account-tie-outline',
  member: 'account-outline',
  guest: 'account-question-outline',
  custom: 'account-star-outline',
};

/**
 * Never appears interactive unless `onPress` is actually wired — a chip with
 * no `onPress` renders with `accessibilityRole="text"`, not "button," so a
 * screen reader never promises an action that doesn't exist.
 */
export const UserRoleChip = ({ role, tone = 'neutral', icon, onPress, style, containerStyle, testID }: UserRoleChipProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? `role-chip-${role.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <Chip
      compact
      mode={tone === 'neutral' ? 'outlined' : 'flat'}
      icon={() => <Icon source={icon ?? TONE_ICON[tone]} size={13} color={tone === 'admin' ? theme.colors.primary : enterprise.colors.onSurfaceVariant} />}
      onPress={onPress}
      disabled={!onPress}
      style={[tone !== 'neutral' ? { backgroundColor: enterprise.colors.surfaceVariant } : undefined, containerStyle, style]}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`Role: ${role}`}
      testID={id}
    >
      {role}
    </Chip>
  );
};
