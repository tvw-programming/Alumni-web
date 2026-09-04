/**
 * USAGE — VideoCallControlsBar
 *
 * The bar is driven entirely by state from the (simulated) call service. Toggling
 * a control emits intent; the service flips `active` and the label with it.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useConfirm } from '@ui/providers/ConfirmProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { CallControl, CallQuality } from '../types/domain';
import { VideoCallControlsBar, type OverflowAction } from './VideoCallControlsBar';
import sample from './VideoCallControlsBar.sample.json';

interface Scenario {
  quality: CallQuality;
  elapsedSeconds?: number;
  controls: CallControl[];
}

const data = loadSample<{ scenarios: Record<string, Scenario>; overflowActions: OverflowAction[] }>(sample);
type ScenarioKey = 'inCall' | 'mutedNoCamera' | 'waitingRoom' | 'audioOnlyReconnecting';

export const VideoCallControlsBarUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const confirm = useConfirm();

  const [key, setKey] = useState<ScenarioKey>('inCall');
  const [controls, setControls] = useState<CallControl[]>(data.scenarios.inCall!.controls);
  const [elapsed, setElapsed] = useState(data.scenarios.inCall!.elapsedSeconds ?? 0);

  useEffect(() => {
    setControls(data.scenarios[key]!.controls);
    setElapsed(data.scenarios[key]!.elapsedSeconds ?? 0);
  }, [key]);

  useEffect(() => {
    if (key === 'waitingRoom') return;
    const id = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(id);
  }, [key]);

  /** In production this calls the SDK and the SDK reports the new state back. */
  const toggle = useCallback(
    (control: CallControl) => {
      if (control.permission === 'denied') {
        toast.warning('Camera access is blocked. Enable it in Settings.');
        return;
      }
      setControls((prev) =>
        prev.map((item) => {
          if (item.id !== control.id) return item;
          const nextActive = !item.active;
          const labels: Record<string, [string, string]> = {
            microphone: ['Mute microphone', 'Unmute microphone'],
            camera: ['Turn camera off', 'Turn camera on'],
            speaker: ['Switch to earpiece', 'Switch to speaker'],
            chat: ['Close chat', 'Open chat'],
            captions: ['Turn captions off', 'Turn captions on'],
          };
          const pair = labels[item.type];
          return { ...item, active: nextActive, label: pair ? (nextActive ? pair[0] : pair[1]) : item.label };
        }),
      );
    },
    [toast],
  );

  const end = useCallback(async () => {
    const ok = await confirm({
      title: key === 'waitingRoom' ? 'Leave the waiting room?' : 'End this call?',
      message:
        key === 'waitingRoom'
          ? 'Your clinician has not joined yet. You can rejoin from your appointment.'
          : 'Your consultation will finish and the clinician will be disconnected.',
      confirmLabel: key === 'waitingRoom' ? 'Leave' : 'End call',
      cancelLabel: 'Stay',
      destructive: true,
    });
    if (ok) toast.show('Call ended');
  }, [confirm, key, toast]);

  return (
    <View style={styles.flex}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <SegmentedButtons
          value={key}
          onValueChange={(next) => setKey(next as ScenarioKey)}
          density="small"
          buttons={[
            { value: 'inCall', label: 'In call' },
            { value: 'mutedNoCamera', label: 'Muted' },
            { value: 'waitingRoom', label: 'Waiting' },
            { value: 'audioOnlyReconnecting', label: 'Audio' },
          ]}
        />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          In the "Muted" scenario the camera permission is denied, so the control is disabled and explains why rather
          than failing silently. Every button carries a text label under the icon.
        </Text>
      </View>

      {/* Stands in for the remote video surface. */}
      <View style={[styles.stage, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {key === 'waitingRoom' ? 'Waiting for your clinician…' : 'Dr. Priya Shah'}
        </Text>
      </View>

      <VideoCallControlsBar
        controls={controls}
        onToggle={toggle}
        onEnd={() => void end()}
        overflowActions={data.overflowActions.map((action) => ({
          ...action,
          onPress: () => toast.show(action.label),
        }))}
        quality={data.scenarios[key]!.quality}
        elapsedSeconds={key === 'waitingRoom' ? undefined : elapsed}
        recording={key === 'inCall'}
        audioOnly={key === 'audioOnlyReconnecting'}
        waitingRoom={key === 'waitingRoom'}
        interpreterAvailable
        onRequestInterpreter={() => toast.success('An interpreter has been requested')}
        testID="call-controls"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 180 },
});
