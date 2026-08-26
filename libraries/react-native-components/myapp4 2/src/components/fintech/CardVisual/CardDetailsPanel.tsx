import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, IconButton, List, Switch, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { StateView } from '@ui/molecules/StateView';
import { useConfirm } from '@ui/providers/ConfirmProvider';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import { useFintechTheme } from '../theme/fintechTokens';
import type { Action, CardStatus } from '../types/domain';

export interface RevealedCardDetails {
  /** Only ever held in memory, only after authentication. */
  pan: string;
  cvv: string;
  expiry: string;
}

export interface CardDetailsPanelProps {
  status: CardStatus;
  /** Must trigger authentication and resolve with the details, or reject. */
  onReveal: () => Promise<RevealedCardDetails>;
  onCopy?: (field: 'pan' | 'cvv') => void;
  onFreezeToggle?: (frozen: boolean) => void;
  onSetLimits?: () => void;
  actions?: Action[];
  /** Seconds before revealed details are wiped from state. */
  hideAfterSeconds?: number;
  testID?: string;
}

/**
 * Credential access — deliberately a SEPARATE component from `CardVisual`.
 *
 * Keeping them apart means a product team cannot accidentally couple decorative
 * card rendering to PAN exposure, and this file is the only one a security
 * reviewer needs to read closely.
 */
export const CardDetailsPanel = ({
  status,
  onReveal,
  onCopy,
  onFreezeToggle,
  onSetLimits,
  actions = [],
  hideAfterSeconds = 30,
  testID,
}: CardDetailsPanelProps) => {
  const theme = useAppTheme();
  const fintech = useFintechTheme();
  const confirm = useConfirm();

  const [details, setDetails] = useState<RevealedCardDetails | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string>();
  const [frozen, setFrozen] = useState(status === 'frozen');

  const reveal = useCallback(async () => {
    setRevealing(true);
    setError(undefined);
    try {
      const result = await onReveal();
      setDetails(result);
      // Auto-hide: revealed credentials should not sit on screen indefinitely.
      setTimeout(() => setDetails(null), hideAfterSeconds * 1000);
    } catch {
      setError('We could not verify you. Try again.');
    } finally {
      setRevealing(false);
    }
  }, [hideAfterSeconds, onReveal]);

  const handleFreeze = useCallback(
    async (next: boolean) => {
      if (next) {
        const ok = await confirm({
          title: 'Freeze this card?',
          message: 'Payments will be declined until you unfreeze it. Existing subscriptions may fail.',
          confirmLabel: 'Freeze card',
        });
        if (!ok) return;
      }
      setFrozen(next);
      onFreezeToggle?.(next);
    },
    [confirm, onFreezeToggle],
  );

  return (
    <View testID={testID}>
      {details ? (
        <View style={[styles.details, { gap: theme.spacing.sm }]}>
          <DetailRow label="Card number" value={details.pan} onCopy={() => onCopy?.('pan')} testID={childTestID(testID, 'pan')} />
          <DetailRow label="Expiry" value={details.expiry} />
          <DetailRow label="CVV" value={details.cvv} onCopy={() => onCopy?.('cvv')} testID={childTestID(testID, 'cvv')} />
          <Text variant="labelSmall" style={{ color: fintech.colors.statusPending }}>
            These details hide automatically in {hideAfterSeconds} seconds.
          </Text>
        </View>
      ) : error ? (
        <StateView preset="error" compact title="Verification failed" description={error} primaryAction={{ label: 'Try again', onPress: () => void reveal() }} />
      ) : (
        <AppButton
          variant="secondary"
          fullWidth
          icon="eye-outline"
          loading={revealing}
          onPress={() => void reveal()}
          testID={childTestID(testID, 'reveal')}
        >
          Show card details
        </AppButton>
      )}

      <Divider style={{ marginVertical: theme.spacing.md }} />

      <List.Item
        title="Freeze card"
        description={frozen ? 'Card is frozen — payments are declined' : 'Temporarily block all payments'}
        right={() => (
          <Switch
            value={frozen}
            onValueChange={(next) => void handleFreeze(next)}
            accessibilityLabel={frozen ? 'Unfreeze card' : 'Freeze card'}
          />
        )}
      />
      {onSetLimits ? (
        <List.Item title="Spending limits" onPress={onSetLimits} right={() => <List.Icon icon="chevron-right" />} />
      ) : null}

      {actions.map((action) => (
        <List.Item
          key={action.key}
          title={action.label}
          onPress={action.onPress}
          titleStyle={action.destructive ? { color: fintech.colors.statusError } : undefined}
          right={() => <List.Icon icon={action.icon ?? 'chevron-right'} />}
        />
      ))}
    </View>
  );
};

const DetailRow = ({
  label,
  value,
  onCopy,
  testID,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  testID?: string;
}) => {
  const theme = useAppTheme();
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.flex}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {label}
        </Text>
        <Text variant="bodyLarge" style={styles.mono} selectable>
          {value}
        </Text>
      </View>
      {onCopy ? <IconButton icon="content-copy" onPress={onCopy} accessibilityLabel={`Copy ${label}`} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  details: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  mono: { letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
});
