/**
 * USAGE — MessageStatusIcon + TypingIndicator
 *
 * The two behaviours worth checking: with read receipts disabled the icon stops
 * at "Delivered" rather than claiming "Read", and the stale typing indicator
 * disappears instead of animating forever after the socket drops.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Divider, SegmentedButtons, Switch, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { MessageStatus, TypingState } from '../types/domain';
import { MessageStatusIcon, TypingIndicator } from './MessageStatusIcon';
import sample from './MessageStatus.sample.json';

const data = loadSample<{
  statuses: MessageStatus[];
  typing: Record<string, { users: string[]; updatedAt: string }>;
}>(sample);

type TypingKey = 'one' | 'two' | 'several' | 'stale' | 'none';

export const MessageStatusUsage = () => {
  const theme = useAppTheme();
  const [receiptsOff, setReceiptsOff] = useState(false);
  const [typingKey, setTypingKey] = useState<TypingKey>('one');

  /** "LIVE" in the sample means "now", so the stale case is genuinely stale. */
  const typing = useMemo<TypingState>(() => {
    const entry = data.typing[typingKey]!;
    return {
      users: entry.users,
      updatedAt: entry.updatedAt === 'LIVE' ? new Date().toISOString() : entry.updatedAt,
    };
  }, [typingKey]);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="labelMedium" style={{ flex: 1 }}>
          Recipient has read receipts off
        </Text>
        <Switch value={receiptsOff} onValueChange={setReceiptsOff} accessibilityLabel="Read receipts disabled" />
      </View>

      <AppCard variant="outlined" title="Delivery status">
        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
          {data.statuses.map((status) => (
            <View key={status} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <Text variant="labelSmall" style={{ width: 72, color: theme.colors.onSurfaceVariant }}>
                {status}
              </Text>
              <MessageStatusIcon status={status} readReceiptsDisabled={receiptsOff} showLabel testID={`status-${status}`} />
            </View>
          ))}
        </View>
        {receiptsOff ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm }}>
            With receipts off, "read" and "played" both render as Delivered — the app never claims knowledge it does not
            honestly have.
          </Text>
        ) : null}
      </AppCard>

      <Divider />

      <SegmentedButtons
        value={typingKey}
        onValueChange={(next) => setTypingKey(next as TypingKey)}
        density="small"
        buttons={[
          { value: 'one', label: 'One' },
          { value: 'two', label: 'Two' },
          { value: 'several', label: 'Several' },
          { value: 'stale', label: 'Stale' },
          { value: 'none', label: 'None' },
        ]}
      />

      <AppCard variant="outlined" title="Typing indicator">
        <View style={{ marginTop: theme.spacing.sm, gap: theme.spacing.sm }}>
          <TypingIndicator typing={typing} testID="typing-inline" />
          <TypingIndicator typing={typing} inBubble testID="typing-bubble" />
          {typingKey === 'stale' ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              This indicator is older than the staleness window, so it renders nothing at all rather than animating
              forever after a dropped connection.
            </Text>
          ) : null}
        </View>
      </AppCard>
    </ScrollView>
  );
};
