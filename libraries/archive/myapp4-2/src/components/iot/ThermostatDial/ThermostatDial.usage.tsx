/**
 * USAGE — ThermostatDial
 *
 * The dial's plus/minus buttons are fully equivalent to dragging the ring —
 * temperature is never adjustable only by gesture.
 */
import React, { useState } from 'react';
import { View } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ClimateCapability } from '../types/domain';
import { ThermostatDial } from './ThermostatDial';
import sample from './ThermostatDial.sample.json';

const initial = loadSample<ClimateCapability & { mode: ClimateCapability['modes'][number] }>(sample);

export const ThermostatDialUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [target, setTarget] = useState(initial.target);
  const [mode, setMode] = useState(initial.mode);
  const [updating, setUpdating] = useState(false);

  return (
    <View style={{ padding: theme.spacing.md, alignItems: 'center' }}>
      <ThermostatDial
        targetTemperature={target}
        currentTemperature={initial.current}
        min={initial.min}
        max={initial.max}
        step={initial.step}
        unit={initial.unit}
        mode={mode}
        fanMode="auto"
        updating={updating}
        onTemperatureChange={(value) => {
          setUpdating(true);
          setTarget(value);
          setTimeout(() => {
            setUpdating(false);
            toast.show(`Target set to ${value}°C`);
          }, 500);
        }}
        onModeChange={(next) => {
          setMode(next);
          toast.show(`Mode set to ${next}`);
        }}
      />
    </View>
  );
};
