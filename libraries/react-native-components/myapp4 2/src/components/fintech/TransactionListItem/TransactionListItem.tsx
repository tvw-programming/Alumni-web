import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, Text } from 'react-native-paper';

import { ListItemRow, type SwipeAction } from '@ui/molecules/ListItemRow';
import { StatusBadge } from '@ui/atoms/StatusBadge';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { Size } from '@ui/primitives';
import type { AnimatableProps } from '@/hooks';

import { useFintechTheme } from '../theme/fintechTokens';
import { formatMoney, formatMoneyForA11y } from '../types/money';
import type { Direction, Transaction, TransactionStatus } from '../types/domain';

/** Density maps onto the base row's size scale — no second sizing system. */
export type TransactionDensity = 'dashboard' | 'history' | 'search';

const DENSITY_TO_SIZE: Record<TransactionDensity, Size> = {
  dashboard: 'sm',
  history: 'md',
  search: 'md',
};

/**
 * Status presentation. Every entry carries an icon and a word — never colour
 * alone, which is both a WCAG requirement and a plain correctness issue for the
 * ~8% of men with colour-vision deficiency.
 */
const STATUS_META: Record<TransactionStatus, { label: string; icon?: string; muted: boolean }> = {
  pending: { label: 'Pending', icon: 'clock-outline', muted: true },
  completed: { label: '', muted: false },
  reversed: { label: 'Reversed', icon: 'undo', muted: true },
  refunded: { label: 'Refund', icon: 'cash-refund', muted: false },
  failed: { label: 'Failed', icon: 'alert-circle-outline', muted: true },
  declined: { label: 'Declined', icon: 'close-circle-outline', muted: true },
  canceled: { label: 'Canceled', icon: 'cancel', muted: true },
  disputed: { label: 'Disputed', icon: 'gavel', muted: true },
};

const KIND_ICON: Record<string, string> = {
  card: 'credit-card-outline',
  transfer: 'bank-transfer',
  cash: 'cash',
  directDebit: 'calendar-sync',
  fee: 'receipt',
  refund: 'cash-refund',
  recurring: 'autorenew',
};

export interface TransactionListItemProps extends Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  transaction: Transaction;
  density?: TransactionDensity;
  locale?: string;
  onPress?: (transaction: Transaction) => void;
  onLongPress?: (transaction: Transaction) => void;
  /** Only supply these when the same actions exist in a menu too. */
  swipeActions?: { left?: SwipeAction[]; right?: SwipeAction[] };
  /** Slot overrides — use these before reaching for a new variant. */
  leadingVisual?: React.ReactNode;
  trailingAction?: React.ReactNode;
  selected?: boolean;
  divider?: boolean;
  testID?: string;
}

const signFor = (direction: Direction): '+' | '−' => (direction === 'credit' ? '+' : '−');

export const TransactionListItem = memo(function TransactionListItem({
  transaction,
  density = 'history',
  locale = 'en-IN',
  onPress,
  onLongPress,
  swipeActions,
  leadingVisual,
  trailingAction,
  selected = false,
  divider = true,
  animated = true,
  entering = false,
  index = 0,
  testID,
}: TransactionListItemProps) {
  const theme = useAppTheme();
  const fintech = useFintechTheme();

  const meta = STATUS_META[transaction.status];
  const isCredit = transaction.direction === 'credit';
  const settled = transaction.status === 'completed';

  const amountColor = !settled
    ? fintech.colors.amountNeutral
    : isCredit
      ? fintech.colors.amountCredit
      : fintech.colors.amountDebit;

  const size = DENSITY_TO_SIZE[density];
  const id = testID ?? `txn-${transaction.id}`;

  const leading = useMemo(() => {
    if (leadingVisual) return leadingVisual;
    const avatarSize = theme.sizing.avatar[size === 'sm' ? 'sm' : 'md'];

    // Merchant logo → category icon → initials → kind icon. Unknown merchants
    // must still render something recognisable.
    if (transaction.category?.icon) {
      return (
        <View
          style={[
            styles.avatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.surfaceVariant,
            },
          ]}
        >
          <Icon source={transaction.category.icon} size={theme.sizing.icon.md} color={theme.colors.onSurfaceVariant} />
        </View>
      );
    }
    if (transaction.merchantName && transaction.merchantName !== 'Unknown') {
      return <Avatar.Text size={avatarSize} label={initialsOf(transaction.merchantName)} />;
    }
    return (
      <View
        style={[
          styles.avatar,
          { width: avatarSize, height: avatarSize, borderRadius: theme.radii.pill, backgroundColor: theme.colors.surfaceVariant },
        ]}
      >
        <Icon source={KIND_ICON[transaction.kind] ?? 'help'} size={theme.sizing.icon.md} color={theme.colors.onSurfaceVariant} />
      </View>
    );
  }, [leadingVisual, size, theme, transaction]);

  /** Secondary line: category, then any metadata the caller attached. */
  const subtitle = useMemo(() => {
    const parts = [transaction.category?.label];
    if (transaction.metadata) parts.push(...Object.values(transaction.metadata));
    if (transaction.isDuplicateSuspect) parts.push('Possible duplicate');
    return parts.filter(Boolean).join(' · ');
  }, [transaction]);

  const trailing = (
    <View style={styles.trailing}>
      <Text
        variant={density === 'dashboard' ? 'bodyMedium' : 'bodyLarge'}
        style={[
          styles.amount,
          { color: amountColor, textDecorationLine: transaction.status === 'reversed' ? 'line-through' : 'none' },
        ]}
        numberOfLines={1}
        testID={childTestID(id, 'amount')}
      >
        {signFor(transaction.direction)}
        {formatMoney(transaction.amount, { locale, omitSymbol: false })}
      </Text>

      {meta.label ? (
        <View style={styles.statusRow}>
          {meta.icon ? <Icon source={meta.icon} size={12} color={fintech.colors.statusNeutral} /> : null}
          <StatusBadge
            status={transaction.status}
            label={meta.label}
            size="sm"
            shape="pill"
            pulse={transaction.status === 'pending'}
            containerStyle={{ marginLeft: 4 }}
            testID={childTestID(id, 'status')}
          />
        </View>
      ) : null}

      {trailingAction}
    </View>
  );

  return (
    <ListItemRow
      title={transaction.merchantName || 'Unknown merchant'}
      subtitle={subtitle || undefined}
      leading={leading}
      trailing={trailing}
      size={size}
      selected={selected}
      divider={divider}
      swipeActions={swipeActions}
      onPress={onPress ? () => onPress(transaction) : undefined}
      onLongPress={onLongPress ? () => onLongPress(transaction) : undefined}
      animated={animated}
      entering={entering}
      index={index}
      testID={id}
    />
  );
});

/**
 * Screen-reader sentence for a transaction. Exported so a detail screen can
 * reuse exactly the same phrasing as the row.
 */
export const describeTransaction = (transaction: Transaction, locale = 'en-IN'): string => {
  const meta = STATUS_META[transaction.status];
  const verb = transaction.direction === 'credit' ? 'received' : 'paid';
  return [
    transaction.merchantName,
    `${verb} ${formatMoneyForA11y(transaction.amount, locale)}`,
    meta.label || 'completed',
    transaction.statusExplanation,
  ]
    .filter(Boolean)
    .join(', ');
};

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  trailing: { alignItems: 'flex-end', maxWidth: 150 },
  // Tabular figures keep the amount column optically aligned.
  amount: { fontVariant: ['tabular-nums'] },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
});
