/**
 * USAGE — CancelReasonSheet
 *
 * "Keep booking" is rendered as a full-width button above "Cancel booking" —
 * same size, same weight — so the exit isn't the only prominent action.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import type { Money } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { CancelReason } from '../types/domain';
import { CancelReasonSheet } from './CancelReasonSheet';
import rawSample from './CancelReasonSheet.sample.json';

const sample = loadSample<{ reasons: CancelReason[]; cancellationFee: Money }>(rawSample);

export const CancelReasonSheetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = (reasonId: string, note?: string) => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setVisible(false);
      const reason = sample.reasons.find((r) => r.id === reasonId);
      toast.success(`Booking canceled — ${reason?.label ?? reasonId}`);
    }, 800);
  };

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="bodyMedium">Need to cancel your upcoming booking?</Text>
      <AppButton variant="danger" onPress={() => setVisible(true)}>
        Cancel booking
      </AppButton>

      <CancelReasonSheet
        visible={visible}
        reasons={sample.reasons}
        cancellationFee={sample.cancellationFee}
        submitting={submitting}
        onDismiss={() => setVisible(false)}
        onConfirmCancel={handleConfirm}
      />
    </View>
  );
};
