/**
 * USAGE — SliderControl
 *
 * Dragging updates the visible value immediately; only `onChangeComplete`
 * (on release) is treated here as the point a device command would be sent.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import { SliderControl } from './SliderControl';
import sample from './SliderControl.sample.json';

interface SliderSample {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
}

const data = loadSample<{ brightness: SliderSample; volume: SliderSample; temperature: SliderSample; offline: SliderSample }>(sample);

export const SliderControlUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [brightness, setBrightness] = useState(data.brightness.value);
  const [volume, setVolume] = useState(data.volume.value);
  const [temperature, setTemperature] = useState(data.temperature.value);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <SliderControl {...data.brightness} value={brightness} onChange={setBrightness} onChangeComplete={(v) => toast.show(`Brightness set to ${v}%`)} />
      <SliderControl {...data.volume} value={volume} onChange={setVolume} onChangeComplete={(v) => toast.show(`Volume set to ${v}%`)} />
      <SliderControl {...data.temperature} value={temperature} onChange={setTemperature} onChangeComplete={(v) => toast.show(`Temperature set to ${v}°C`)} />
      <SliderControl {...data.offline} value={data.offline.value} disabled onChange={() => {}} />
    </ScrollView>
  );
};
