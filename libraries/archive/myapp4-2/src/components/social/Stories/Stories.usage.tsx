/**
 * USAGE — StoryRing + StoryTray + StoryViewer
 *
 * The viewer auto-advances but every gesture has a button equivalent: pause,
 * previous, next and close are all real controls. Timed content that can only
 * be paused by holding a finger down excludes switch and keyboard users.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Switch, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { StoryItem, StorySegment } from '../types/domain';
import { StoryRing } from './StoryRing';
import { StoryTray } from './StoryTray';
import { StoryViewer } from './StoryViewer';
import sample from './Stories.sample.json';

const data = loadSample<{
  items: StoryItem[];
  uploadingItem: StoryItem;
  failedItem: StoryItem;
  segments: StorySegment[];
}>(sample);

export const StoriesUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [open, setOpen] = useState<StoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ flex: 1 }}>
            Loading tray
          </Text>
          <Switch value={loading} onValueChange={setLoading} accessibilityLabel="Loading tray" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ flex: 1 }}>
            Empty tray
          </Text>
          <Switch value={empty} onValueChange={setEmpty} accessibilityLabel="Empty tray" />
        </View>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          The gradient ring is decoration — unseen, live and close-friends status are all in the accessible label and
          repeated in the caption under each avatar.
        </Text>
      </View>

      <StoryTray
        items={empty ? [] : data.items}
        loading={loading}
        onPressStory={(item) => {
          if (item.isOwn) {
            toast.show('Opening the story composer');
            return;
          }
          setOpen(item);
        }}
        onRetryUpload={() => toast.show('Retrying upload')}
        testID="story-tray"
      />

      <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <Text variant="labelLarge">Upload states</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
          <StoryRing item={data.uploadingItem} testID="story-uploading" />
          <StoryRing item={data.failedItem} onRetryUpload={() => toast.show('Retrying upload')} testID="story-failed" />
        </View>
      </View>

      {open ? (
        <StoryViewer
          visible
          onDismiss={() => setOpen(null)}
          item={open}
          segments={data.segments}
          onSegmentChange={(index) => toast.show(`Segment ${index + 1}`)}
          onReply={(item) => toast.show(`Replying to ${item.user.displayName}`)}
          onReport={() => toast.show('Opening the report sheet')}
          testID="story-viewer"
        />
      ) : null}
    </ScrollView>
  );
};
