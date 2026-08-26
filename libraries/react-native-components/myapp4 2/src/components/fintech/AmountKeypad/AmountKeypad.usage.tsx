/**
 * USAGE — AmountKeypad
 *
 * The canonical send-money flow: recipient context → amount → submit. The
 * screen owns the fee recalculation; the keypad only reports state.
 */
import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { Avatar, SegmentedButtons, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import { formatMoney } from '../types/money';
import { AmountKeypad, type AmountKeypadHandle, type AmountKeypadProps } from './AmountKeypad';
import type { AmountInputState } from './amountEntry';
import sample from './AmountKeypad.sample.json';

const samples = loadSample<Record<string, AmountKeypadProps>>(sample);
type SampleKey = 'sendMoney' | 'zeroDecimalCurrency' | 'internationalTransfer';

export const AmountKeypadUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const keypad = useRef<AmountKeypadHandle>(null);

  const [preset, setPreset] = useState<SampleKey>('sendMoney');
  const [submitting, setSubmitting] = useState(false);
  const [live, setLive] = useState<AmountInputState | null>(null);

  const config = samples[preset]!;

  /** Fee recalculation lives here, not in the component. */
  const footnote =
    live && live.minorUnits > 0
      ? `Fee ${formatMoney({ minorUnits: Math.round(live.minorUnits * 0.005), currency: config.currency })} · Arrives instantly`
      : config.footnote;

  const handleSubmit = useCallback(
    async (state: AmountInputState) => {
      setSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSubmitting(false);
      toast.success(`Sending ${state.formattedValue}`);
      keypad.current?.clear();
    },
    [toast],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: theme.spacing.md }}>
        <SegmentedButtons
          value={preset}
          onValueChange={(next) => setPreset(next as SampleKey)}
          buttons={[
            { value: 'sendMoney', label: 'INR' },
            { value: 'zeroDecimalCurrency', label: 'JPY' },
            { value: 'internationalTransfer', label: 'USD' },
          ]}
        />
      </View>

      <AmountKeypad
        // Remount on currency change so the digit buffer resets cleanly.
        key={preset}
        ref={keypad}
        {...config}
        footnote={footnote}
        submitting={submitting}
        onChange={setLive}
        onSubmit={handleSubmit}
        testID="amount-keypad"
        context={
          <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
            <Avatar.Text size={48} label="AS" />
            <Text variant="titleMedium">Alex Smith</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              @alexsmith · Verified
            </Text>
          </View>
        }
      />
    </View>
  );
};
