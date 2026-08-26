import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, RadioButton, Text, TextInput, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { formatMoney, type Money } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useServiceTheme } from '../theme/ondemandTokens';
import type { CancelReason } from '../types/domain';

export interface CancelReasonSheetProps extends StyleEscapeHatches {
  visible: boolean;
  reasons: CancelReason[];
  cancellationFee?: Money;
  locale?: string;
  submitting?: boolean;
  onDismiss: () => void;
  onConfirmCancel: (reasonId: string, note?: string) => void;
}

/**
 * The exit and the alternative are given equal visual weight — "Keep booking"
 * is a full-size button, not a dismissive text link — because a cancellation
 * flow should never be designed to talk someone out of leaving through button
 * hierarchy alone. Selecting a reason never cancels by itself; a second,
 * explicit tap on "Cancel booking" is always required, and any fee that
 * applies is disclosed directly above that button, not buried above the fold.
 */
export const CancelReasonSheet = ({
  visible,
  reasons,
  cancellationFee,
  locale = 'en-IN',
  submitting = false,
  onDismiss,
  onConfirmCancel,
  style,
  containerStyle,
  testID,
}: CancelReasonSheetProps) => {
  const theme = useAppTheme();
  const service = useServiceTheme();
  const id = testID ?? 'cancel-reason-sheet';
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState('');

  const selected = useMemo(() => reasons.find((r) => r.id === selectedId), [reasons, selectedId]);
  const feeApplies = selected?.kind === 'feeApplicable';
  const canConfirm = !!selectedId && (!selected?.requiresNote || note.trim().length > 0);

  const reset = () => {
    setSelectedId(undefined);
    setNote('');
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  const handleConfirm = () => {
    if (!selectedId || !canConfirm) return;
    onConfirmCancel(selectedId, note.trim() ? note.trim() : undefined);
    reset();
  };

  return (
    <AppSheet
      visible={visible}
      onDismiss={handleDismiss}
      variant="bottom"
      title="Cancel this booking?"
      dismissible={!submitting}
      scrollable
      style={style}
      containerStyle={containerStyle}
      testID={id}
      footer={
        <View style={{ gap: theme.spacing.sm }}>
          {selected ? (
            <View style={[styles.feeNotice, { backgroundColor: feeApplies ? theme.colors.errorContainer : service.colors.surfaceSelected, borderRadius: theme.radii.sm, padding: theme.spacing.sm }]}>
              <Icon
                source={feeApplies ? 'currency-inr' : 'check-circle-outline'}
                size={15}
                color={feeApplies ? theme.colors.onErrorContainer : service.colors.availableNow}
              />
              <Text
                variant="labelSmall"
                style={{ color: feeApplies ? theme.colors.onErrorContainer : theme.colors.onSurface, marginLeft: 6, flex: 1 }}
              >
                {feeApplies && cancellationFee
                  ? `A cancellation fee of ${formatMoney(cancellationFee, { locale })} applies for this reason.`
                  : feeApplies
                    ? 'A cancellation fee applies for this reason.'
                    : 'No cancellation fee applies.'}
              </Text>
            </View>
          ) : null}

          <View style={styles.buttonRow}>
            <AppButton variant="secondary" size="lg" fullWidth onPress={handleDismiss} disabled={submitting} testID={childTestID(id, 'keep')}>
              Keep booking
            </AppButton>
          </View>
          <AppButton
            variant="danger"
            size="lg"
            fullWidth
            disabled={!canConfirm}
            loading={submitting}
            debounceMs={1000}
            onPress={handleConfirm}
            testID={childTestID(id, 'confirm')}
          >
            Cancel booking
          </AppButton>
        </View>
      }
    >
      <View
        style={{ gap: 2 }}
        accessibilityRole="radiogroup"
        accessibilityLabel="Reason for cancelling"
      >
        {reasons.map((reason) => {
          const isSelected = selectedId === reason.id;
          return (
            <TouchableRipple
              key={reason.id}
              onPress={() => setSelectedId(reason.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, selected: isSelected }}
              accessibilityLabel={`${reason.label}${reason.kind === 'feeApplicable' ? ', cancellation fee applies' : ', no fee'}`}
              style={styles.reasonRow}
              testID={childTestID(id, reason.id)}
            >
              <View style={styles.row}>
                <RadioButton value={reason.id} status={isSelected ? 'checked' : 'unchecked'} onPress={() => setSelectedId(reason.id)} />
                <Text variant="bodyMedium" style={styles.flex}>
                  {reason.label}
                </Text>
                {reason.kind === 'feeApplicable' ? (
                  <Text variant="labelSmall" style={{ color: theme.colors.error }}>
                    Fee
                  </Text>
                ) : null}
              </View>
            </TouchableRipple>
          );
        })}
      </View>

      {selected?.requiresNote ? (
        <TextInput
          mode="outlined"
          multiline
          numberOfLines={3}
          placeholder="Tell us more (required)"
          value={note}
          onChangeText={setNote}
          style={{ marginTop: theme.spacing.sm }}
          accessibilityLabel="Additional detail, required for this reason"
          testID={childTestID(id, 'note')}
        />
      ) : null}
    </AppSheet>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  reasonRow: { paddingVertical: 4 },
  feeNotice: { flexDirection: 'row', alignItems: 'center' },
  buttonRow: { flexDirection: 'row' },
});
