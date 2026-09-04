import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';
import type { RewardClaimStatus, RewardContents } from '../types/domain';

export interface RewardClaimDialogProps extends StyleEscapeHatches {
  visible: boolean;
  reward: RewardContents;
  status: RewardClaimStatus;
  onClaim: () => void;
  onDismiss: () => void;
}

/**
 * Claims are idempotent from the UI's point of view — the dialog shows
 * `claiming` while a request is in flight and only shows `claimed` once the
 * backend confirms it, so a double-tap or a retried request can never grant
 * the reward twice on the client's word alone.
 */
export const RewardClaimDialog = ({ visible, reward, status, onClaim, onDismiss, style, containerStyle, testID }: RewardClaimDialogProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? 'reward-claim-dialog';
  const claimed = status === 'claimed' || status === 'alreadyClaimed';
  const failed = status === 'error';

  return (
    <AppSheet visible={visible} onDismiss={onDismiss} variant="center" dismissible={status !== 'claiming'} scrollable={false} style={style} containerStyle={containerStyle} testID={id}>
      <View style={{ padding: theme.spacing.lg, alignItems: 'center', gap: theme.spacing.md }}>
        <View style={[styles.iconWrap, { backgroundColor: gaming.colors.surfaceSelected, borderRadius: 40 }]}>
          {reward.icon?.uri ? (
            <Image source={{ uri: reward.icon.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityElementsHidden />
          ) : (
            <Icon source="gift-outline" size={36} color={gaming.colors.onSurfaceSelected} />
          )}
        </View>

        <Text variant="titleMedium">
          {reward.quantity}× {reward.label}
        </Text>

        {claimed ? (
          <View style={styles.row}>
            <Icon source="check-circle" size={16} color={gaming.colors.success} />
            <Text variant="bodyMedium" style={{ color: gaming.colors.success, marginLeft: 6 }} accessibilityLiveRegion="polite">
              {status === 'alreadyClaimed' ? 'Already claimed' : 'Reward claimed'}
            </Text>
          </View>
        ) : failed ? (
          <Text variant="bodySmall" style={{ color: gaming.colors.statusError, textAlign: 'center' }}>
            Couldn't claim your reward. Try again — your progress is still here.
          </Text>
        ) : null}

        <View style={{ gap: theme.spacing.sm, width: '100%' }}>
          {!claimed ? (
            <AppButton variant="primary" size="lg" fullWidth loading={status === 'claiming'} debounceMs={800} onPress={onClaim} testID={childTestID(id, 'claim')}>
              {failed ? 'Try again' : 'Claim reward'}
            </AppButton>
          ) : (
            <AppButton variant="primary" size="lg" fullWidth onPress={onDismiss} testID={childTestID(id, 'continue')}>
              Continue
            </AppButton>
          )}
        </View>
      </View>
    </AppSheet>
  );
};

const styles = StyleSheet.create({
  iconWrap: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
