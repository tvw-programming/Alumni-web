/**
 * USAGE — PinPad / BiometricPrompt
 *
 * Drives the component through its real state machine. Note that verification
 * happens HERE, in the caller — the component never validates a PIN.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { AuthState } from '../types/domain';
import { PinPad, type PinPadProps } from './PinPad';
import sample from './PinPad.sample.json';

const samples = loadSample<Record<string, Partial<PinPadProps>>>(sample);
type Scenario = 'transferConfirmation' | 'stepUpHighValue' | 'lockedOut' | 'pinOnly';

const CORRECT_PIN = '123456';

export const PinPadUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [state, setState] = useState<AuthState>('idle');
  const [attempts, setAttempts] = useState(3);
  const [error, setError] = useState<string>();

  const open = useCallback((next: Scenario) => {
    setScenario(next);
    setState(next === 'lockedOut' ? 'locked' : 'pinEntry');
    setAttempts(3);
    setError(undefined);
  }, []);

  const close = useCallback(() => {
    setScenario(null);
    setState('canceled');
  }, []);

  /** All verification logic sits outside the component. */
  const handleAuthenticate = useCallback(
    async (pin: string) => {
      setState('verifying');
      await new Promise((resolve) => setTimeout(resolve, 700));

      if (pin === CORRECT_PIN || pin === CORRECT_PIN.slice(0, pin.length)) {
        setState('success');
        setTimeout(() => {
          setScenario(null);
          // Local success ≠ payment success.
          toast.success('Verified — payment submitted');
        }, 900);
        return;
      }

      const left = attempts - 1;
      setAttempts(left);
      setError('That PIN was not correct');
      setState(left <= 0 ? 'locked' : 'failure');
      setTimeout(() => setState((s) => (s === 'failure' ? 'pinEntry' : s)), 400);
    },
    [attempts, toast],
  );

  const config = scenario ? samples[scenario]! : null;

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="bodyMedium">Demo PIN is 123456. Each button opens a different auth scenario.</Text>

      <AppButton variant="primary" fullWidth onPress={() => open('transferConfirmation')}>
        Transfer confirmation (Face ID + PIN)
      </AppButton>
      <AppButton variant="secondary" fullWidth onPress={() => open('stepUpHighValue')}>
        Step-up for high value (randomized keypad)
      </AppButton>
      <AppButton variant="secondary" fullWidth onPress={() => open('pinOnly')}>
        PIN only, 4 digits
      </AppButton>
      <AppButton variant="danger" fullWidth onPress={() => open('lockedOut')}>
        Locked out state
      </AppButton>

      {config && scenario ? (
        <PinPad
          visible
          state={state}
          transactionContext={config.transactionContext!}
          methods={config.methods}
          preferredMethod={config.preferredMethod}
          pinLength={config.pinLength}
          randomizeKeypad={config.randomizeKeypad}
          lockoutUntil={config.lockoutUntil}
          attemptsRemaining={attempts}
          errorMessage={error}
          onAuthenticate={handleAuthenticate}
          onBiometric={() => {
            setState('biometricPrompt');
            // In production this calls LocalAuthentication / BiometricPrompt.
            setTimeout(() => void handleAuthenticate(CORRECT_PIN), 600);
          }}
          onFallback={() => toast.show('Falling back to device passcode')}
          onRecover={() => toast.show('Opening PIN recovery')}
          onCancel={close}
          testID="pinpad"
        />
      ) : null}

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
