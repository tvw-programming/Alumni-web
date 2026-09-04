/**
 * USAGE — DeviceToggleTile
 *
 * The "on" tiles use a tinted surface, a coloured icon, and the word "On"
 * together — never a filled background alone signalling state.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ToggleTileState } from '../types/domain';
import { DeviceToggleTile } from './DeviceToggleTile';
import sample from './DeviceToggleTile.sample.json';

interface Tile {
  id: string;
  label: string;
  icon: string;
  state: ToggleTileState;
  value?: string;
}

const { tiles: initial } = loadSample<{ tiles: Tile[] }>(sample);

export const DeviceToggleTileUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [tiles, setTiles] = useState(initial);

  const toggle = (tileId: string) => {
    setTiles((prev) => prev.map((t) => (t.id === tileId && (t.state === 'on' || t.state === 'off') ? { ...t, state: t.state === 'on' ? 'off' : 'on' } : t)));
    const tile = tiles.find((t) => t.id === tileId);
    if (tile) toast.show(`${tile.label} ${tile.state === 'on' ? 'turned off' : 'turned on'}`);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {tiles.map((tile) => (
          <DeviceToggleTile
            key={tile.id}
            label={tile.label}
            icon={tile.icon}
            state={tile.state}
            value={tile.value}
            onToggle={() => toggle(tile.id)}
            onLongPress={() => toast.show(`Opening ${tile.label} details`)}
          />
        ))}
      </View>
    </ScrollView>
  );
};
