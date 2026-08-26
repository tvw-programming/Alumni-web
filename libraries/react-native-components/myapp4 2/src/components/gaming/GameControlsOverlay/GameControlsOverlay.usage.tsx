/**
 * USAGE — GameControlsOverlay
 *
 * "Exit" and "Restart" both route through a confirm step in the host screen
 * before firing — the overlay itself never decides that unsaved progress is
 * okay to lose.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useConfirm } from '@ui/providers/ConfirmProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { GameControl } from '../types/domain';
import { GameControlsOverlay } from './GameControlsOverlay';
import sample from './GameControlsOverlay.sample.json';

const { controls: initialControls } = loadSample<{ controls: GameControl[] }>(sample);

export const GameControlsOverlayUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const [visible, setVisible] = useState(true);
  const [controls, setControls] = useState(initialControls);

  const handleControl = async (controlId: string) => {
    const control = controls.find((c) => c.id === controlId);
    if (!control) return;

    if (control.type === 'exit' || control.type === 'restart') {
      const ok = await confirm({
        title: control.type === 'exit' ? 'Exit to menu?' : 'Restart level?',
        message: 'Unsaved progress will be lost.',
        confirmLabel: control.type === 'exit' ? 'Exit' : 'Restart',
        destructive: true,
      });
      if (!ok) return;
      toast.show(control.type === 'exit' ? 'Exiting to menu' : 'Restarting level');
      return;
    }

    setControls((prev) => prev.map((c) => (c.id === controlId ? { ...c, active: !c.active } : c)));
    toast.show(`${control.label} toggled`);
  };

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md, minHeight: 200 }}>
      <Text variant="bodyMedium">Simulated game surface</Text>
      <AppButton variant="secondary" onPress={() => setVisible((v) => !v)}>
        {visible ? 'Hide' : 'Show'} controls overlay
      </AppButton>

      <GameControlsOverlay visible={visible} controls={controls} onControl={handleControl} />
    </View>
  );
};
