import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';

import { useFintechTheme } from '../theme/fintechTokens';
import { formatMoney, type Money } from '../types/money';
import type { Payee } from '../types/domain';
import { formatIdentifier, primaryIdentifier } from './PayeeSelector';

export interface PayeeConfirmationProps {
  payee: Payee;
  amount?: Money;
  locale?: string;
  onConfirm: () => void;
  onEdit?: () => void;
  confirmLabel?: string;
  submitting?: boolean;
  testID?: string;
}

/**
 * The final review step, as its own component.
 *
 * It leads with the *exact identifier*, not the display name — "Send to
 * @alexsmith" is checkable, "Send to Alex Smith" is not when three contacts
 * share that name. Mis-sent payments are largely irreversible, which is why
 * this is a separate, deliberate screen rather than a confirm button.
 */
export const PayeeConfirmation = ({
  payee,
  amount,
  locale = 'en-IN',
  onConfirm,
  onEdit,
  confirmLabel = 'Send',
  submitting = false,
  testID,
}: PayeeConfirmationProps) => {
  const theme = useAppTheme();
  const fintech = useFintechTheme();
  const identifier = primaryIdentifier(payee);
  const handle = formatIdentifier(identifier);

  return (
    <View style={{ gap: theme.spacing.md }} testID={testID}>
      <AppCard variant="filled" entering="fade">
        <View style={[styles.center, { gap: theme.spacing.sm }]}>
          {payee.avatarUrl ? (
            <Avatar.Image size={theme.sizing.avatar.lg} source={{ uri: payee.avatarUrl }} />
          ) : (
            <Avatar.Text size={theme.sizing.avatar.lg} label={initialsOf(payee.displayName)} />
          )}

          {amount ? (
            <Text variant="displaySmall" style={styles.tabular}>
              {formatMoney(amount, { locale })}
            </Text>
          ) : null}

          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Sending to
          </Text>

          {/* The identifier is the headline of this screen. */}
          <Text variant="titleLarge" testID={childTestID(testID, 'handle')}>
            {handle || payee.displayName}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {payee.displayName}
          </Text>

          {payee.verification !== 'verified' ? (
            <View style={[styles.warning, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
              <Icon source="alert-circle-outline" size={18} color={fintech.colors.statusPending} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: theme.spacing.xs, flex: 1 }}>
                We have not verified this recipient. Check the details — payments are usually final.
              </Text>
            </View>
          ) : null}
        </View>
      </AppCard>

      <AppButton
        variant="primary"
        size="lg"
        fullWidth
        loading={submitting}
        debounceMs={1200}
        onPress={onConfirm}
        testID={childTestID(testID, 'confirm')}
      >
        {confirmLabel}
      </AppButton>

      {onEdit ? (
        <AppButton variant="ghost" fullWidth onPress={onEdit} testID={childTestID(testID, 'edit')}>
          Change recipient
        </AppButton>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  warning: { flexDirection: 'row', alignItems: 'center' },
});
