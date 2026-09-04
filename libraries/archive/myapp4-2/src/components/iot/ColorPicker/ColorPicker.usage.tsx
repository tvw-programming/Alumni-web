/**
 * USAGE — ColorPickerWheel + ColorPresetChips
 *
 * Preset chips are the default tab — a precise wheel is available under
 * "Custom," but a named preset ("Reading," "Relax") is never required just
 * to change a light's mood.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ColorPreset, LightColorCapability } from '../types/domain';
import { ColorPickerWheel } from './ColorPickerWheel';
import sample from './ColorPicker.sample.json';

const data = loadSample<{ color: string; brightness: number; capability: LightColorCapability; presets: ColorPreset[] }>(sample);

export const ColorPickerUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [color, setColor] = useState(data.color);
  const [brightness, setBrightness] = useState(data.brightness);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <ColorPickerWheel
        color={color}
        brightness={brightness}
        capability={data.capability}
        presets={data.presets}
        onChange={setColor}
        onChangeComplete={(next) => toast.show(`Color set to ${next.toUpperCase()}`)}
        onBrightnessChange={setBrightness}
        onSaveScene={() => toast.success('Scene saved')}
      />
    </ScrollView>
  );
};
