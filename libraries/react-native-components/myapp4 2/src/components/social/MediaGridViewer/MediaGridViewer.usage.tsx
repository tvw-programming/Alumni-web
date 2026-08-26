/**
 * USAGE — MediaGridViewer
 *
 * Image URIs are unreachable, so every tile falls back to its state treatment.
 * The viewer shows the alt text on screen as well as in the accessibility tree,
 * and announces "Image 3 of 12" on every change rather than only on open.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Switch, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { MediaTile } from '../types/domain';
import { MediaGridViewer } from './MediaGridViewer';
import sample from './MediaGridViewer.sample.json';

const { tiles } = loadSample<{ tiles: MediaTile[] }>(sample);

export const MediaGridViewerUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [columns, setColumns] = useState(3);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <SegmentedButtons
          value={String(columns)}
          onValueChange={(next) => setColumns(Number(next))}
          density="small"
          buttons={[
            { value: '2', label: '2 columns' },
            { value: '3', label: '3 columns' },
            { value: '4', label: '4 columns' },
          ]}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ flex: 1 }}>
            Loading
          </Text>
          <Switch value={loading} onValueChange={setLoading} accessibilityLabel="Loading" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ flex: 1 }}>
            Empty
          </Text>
          <Switch value={empty} onValueChange={setEmpty} accessibilityLabel="Empty" />
        </View>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Tiles keep a fixed aspect ratio so the grid never reflows as images arrive. Tile 9 is behind a content warning;
          tile 8 is restricted; tiles 5 and 6 are still processing.
        </Text>
      </View>

      <MediaGridViewer
        tiles={empty ? [] : tiles}
        columns={columns}
        loading={loading}
        onTilePress={(tile) => toast.show(tile.media.alt.slice(0, 40))}
        onDownload={() => toast.success('Saved to your device')}
        onShare={() => toast.show('Opening the share sheet')}
        onReport={() => toast.show('Opening the report sheet')}
        testID="media-grid"
      />
    </ScrollView>
  );
};
