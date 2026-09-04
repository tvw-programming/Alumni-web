import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, ProgressBar, RadioButton, Text, TextInput, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import type { DeviceCandidate, DeviceConfig, PairingError, PairingState, PairingStep, PairingStepId } from '../types/domain';

const DEFAULT_STEPS: PairingStep[] = [
  { id: 'scan', title: 'Scan', description: 'Find nearby devices by QR code or Bluetooth.' },
  { id: 'discover', title: 'Discover', description: 'Choose the device you want to add.' },
  { id: 'connect', title: 'Connect', description: "Connecting to the device — don't close the app." },
  { id: 'configure', title: 'Configure', description: 'Name the device and choose a room.' },
  { id: 'complete', title: 'Done', description: 'Your device is ready.' },
];

const STATE_STEP: Record<PairingState, PairingStepId> = {
  idle: 'scan',
  requestingPermission: 'scan',
  scanning: 'scan',
  discovering: 'discover',
  connecting: 'connect',
  configuring: 'configure',
  success: 'complete',
  error: 'discover',
  canceled: 'scan',
};

export interface DevicePairingWizardProps extends StyleEscapeHatches {
  steps?: PairingStep[];
  state: PairingState;
  candidates?: DeviceCandidate[];
  selectedCandidateId?: string;
  error?: PairingError;
  config: DeviceConfig;
  rooms?: string[];
  onStartScan: () => void;
  onUseManualCode: () => void;
  onSelectCandidate: (candidate: DeviceCandidate) => void;
  onConnect: () => void;
  onConfigChange: (config: DeviceConfig) => void;
  onConfigSubmit: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onFinish: () => void;
}

/**
 * Setup is always recoverable: every failure state offers "Try again" and
 * "Cancel" rather than a dead end, the manual setup-code path is always
 * visible as a real fallback next to the QR scan, and "Step X of Y" is
 * rendered as text — never implied only by a progress bar.
 */
export const DevicePairingWizard = ({
  steps = DEFAULT_STEPS, state, candidates = [], selectedCandidateId, error, config, rooms = [],
  onStartScan, onUseManualCode, onSelectCandidate, onConnect, onConfigChange, onConfigSubmit, onRetry, onCancel, onFinish,
  style, containerStyle, testID,
}: DevicePairingWizardProps) => {
  const theme = useAppTheme();
  const iot = useSmartHomeTheme();
  const id = testID ?? 'device-pairing-wizard';
  const currentStepId = STATE_STEP[state];
  const stepIndex = Math.max(0, steps.findIndex((s) => s.id === currentStepId));
  const step = steps[stepIndex] ?? steps[0];
  const isError = state === 'error';

  if (!step) return null;

  return (
    <ScrollView style={[containerStyle, style]} testID={id}>
      <Text variant="labelMedium" style={{ color: iot.colors.onSurfaceVariant }} accessibilityLiveRegion="polite">
        Step {stepIndex + 1} of {steps.length}
      </Text>
      <ProgressBar
        progress={(stepIndex + 1) / steps.length}
        color={isError ? theme.colors.error : theme.colors.primary}
        style={{ height: 4, borderRadius: 2, marginTop: 4, marginBottom: theme.spacing.sm, backgroundColor: iot.colors.surfaceVariant }}
      />
      <Text variant="titleMedium" accessibilityRole="header">
        {step.title}
      </Text>
      <Text variant="bodySmall" style={{ color: iot.colors.onSurfaceVariant, marginTop: 2, marginBottom: theme.spacing.md }}>
        {step.description}
      </Text>

      {isError && error ? (
        <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.sm }]} accessibilityRole="alert">
          <Icon source="alert-circle-outline" size={16} color={theme.colors.onErrorContainer} />
          <Text variant="labelMedium" style={{ color: theme.colors.onErrorContainer, marginLeft: 6, flex: 1 }}>
            {error.message}
          </Text>
        </View>
      ) : null}

      {(state === 'idle' || state === 'requestingPermission' || state === 'scanning') && (
        <View style={{ gap: theme.spacing.sm }}>
          <View style={[styles.scanBox, { borderColor: iot.colors.surfaceVariant, borderRadius: theme.radii.md }]}>
            {state === 'scanning' || state === 'requestingPermission' ? (
              <>
                <ActivityIndicator size={28} />
                <Text variant="labelMedium" style={{ marginTop: 8 }}>
                  {state === 'requestingPermission' ? 'Requesting camera permission…' : 'Point your camera at the QR code'}
                </Text>
              </>
            ) : (
              <>
                <Icon source="qrcode-scan" size={32} color={iot.colors.onSurfaceVariant} />
                <Text variant="labelMedium" style={{ marginTop: 8 }}>
                  Ready to scan
                </Text>
              </>
            )}
          </View>
          <AppButton variant="primary" size="md" onPress={onStartScan} testID={childTestID(id, 'scan')}>
            Scan QR code
          </AppButton>
          <AppButton variant="ghost" size="md" onPress={onUseManualCode} testID={childTestID(id, 'manual')}>
            Enter setup code manually
          </AppButton>
        </View>
      )}

      {state === 'discovering' && (
        <View style={styles.centerBox}>
          <ActivityIndicator size={28} />
          <Text variant="labelMedium" style={{ marginTop: 8 }}>
            Looking for devices…
          </Text>
        </View>
      )}

      {(isError && step.id === 'discover') || (candidates.length > 0 && (state === 'discovering' || state === 'idle')) ? (
        <View style={{ gap: 8 }}>
          {candidates.map((candidate) => {
            const selected = candidate.id === selectedCandidateId;
            return (
              <TouchableRipple
                key={candidate.id}
                onPress={() => onSelectCandidate(candidate)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${candidate.name}, ${candidate.type}${selected ? ', selected' : ''}`}
                style={[styles.candidateRow, { borderRadius: theme.radii.sm, backgroundColor: selected ? iot.colors.surfaceVariant : 'transparent' }]}
                testID={childTestID(id, `candidate-${candidate.id}`)}
              >
                <View style={styles.row}>
                  <RadioButton value={candidate.id} status={selected ? 'checked' : 'unchecked'} onPress={() => onSelectCandidate(candidate)} />
                  <View style={styles.flex}>
                    <Text variant="bodyMedium">{candidate.name}</Text>
                    <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }}>
                      {candidate.type}
                    </Text>
                  </View>
                </View>
              </TouchableRipple>
            );
          })}
          {selectedCandidateId ? (
            <AppButton variant="primary" size="md" onPress={onConnect} testID={childTestID(id, 'connect')}>
              Connect
            </AppButton>
          ) : null}
        </View>
      ) : null}

      {state === 'connecting' && (
        <View style={styles.centerBox}>
          <ActivityIndicator size={28} />
          <Text variant="labelMedium" style={{ marginTop: 8 }}>
            Connecting…
          </Text>
        </View>
      )}

      {state === 'configuring' && (
        <View style={{ gap: theme.spacing.sm }}>
          <TextInput
            mode="outlined"
            label="Device name"
            value={config.name}
            onChangeText={(name) => onConfigChange({ ...config, name })}
            testID={childTestID(id, 'name-input')}
          />
          {rooms.length > 0 ? (
            <View style={{ gap: 4 }}>
              <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }}>
                Room
              </Text>
              <View style={styles.roomWrap}>
                {rooms.map((room) => {
                  const selected = config.roomId === room;
                  return (
                    <TouchableRipple
                      key={room}
                      onPress={() => onConfigChange({ ...config, roomId: room })}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      style={[styles.roomChip, { borderRadius: theme.radii.pill, backgroundColor: selected ? theme.colors.primaryContainer : iot.colors.surfaceVariant }]}
                    >
                      <Text variant="labelSmall" style={{ color: selected ? theme.colors.onPrimaryContainer : iot.colors.onSurfaceVariant }}>
                        {room}
                      </Text>
                    </TouchableRipple>
                  );
                })}
              </View>
            </View>
          ) : null}
          <AppButton variant="primary" size="md" disabled={!config.name.trim()} onPress={onConfigSubmit} testID={childTestID(id, 'save')}>
            Save and finish
          </AppButton>
        </View>
      )}

      {state === 'success' && (
        <View style={styles.centerBox}>
          <Icon source="check-circle" size={40} color={iot.colors.online} />
          <Text variant="titleSmall" style={{ marginTop: 8 }}>
            "{config.name}" is ready
          </Text>
          <AppButton variant="primary" size="md" onPress={onFinish} style={{ marginTop: theme.spacing.md }} testID={childTestID(id, 'finish')}>
            Done
          </AppButton>
        </View>
      )}

      {isError ? (
        <View style={[styles.row, { marginTop: theme.spacing.md }]}>
          {error?.recoverable !== false ? (
            <AppButton variant="primary" size="md" onPress={onRetry} testID={childTestID(id, 'retry')}>
              Try again
            </AppButton>
          ) : null}
          <AppButton variant="ghost" size="md" onPress={onCancel} style={{ marginLeft: 8 }} testID={childTestID(id, 'cancel')}>
            Cancel
          </AppButton>
        </View>
      ) : state !== 'success' ? (
        <AppButton variant="ghost" size="md" onPress={onCancel} style={{ marginTop: theme.spacing.md }} testID={childTestID(id, 'cancel-flow')}>
          Cancel setup
        </AppButton>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 12 },
  scanBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32, borderWidth: StyleSheet.hairlineWidth },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  candidateRow: { paddingHorizontal: 4, paddingVertical: 2 },
  roomWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roomChip: { paddingHorizontal: 12, paddingVertical: 6 },
});
