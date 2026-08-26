/**
 * USAGE — MentionTextInput
 *
 * Type "@ma" to see several matches. Sara's row warns that she won't be
 * notified *before* you pick her, and Elena's is disabled with a reason —
 * discovering either after posting is the failure this component avoids.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Chip, Switch, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { MentionCandidate, UserSummary } from '../types/domain';
import { MentionTextInput } from './MentionTextInput';
import sample from './MentionTextInput.sample.json';

const data = loadSample<{ directory: MentionCandidate[]; initialValue: string }>(sample);

export const MentionTextInputUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [value, setValue] = useState(data.initialValue);
  const [mentions, setMentions] = useState<UserSummary[]>([]);
  const [offline, setOffline] = useState(false);
  const [capped, setCapped] = useState(false);

  /** Stands in for the remote search, with realistic latency. */
  const searchUsers = useCallback(async (query: string): Promise<MentionCandidate[]> => {
    await new Promise((resolve) => setTimeout(resolve, 320));
    if (!query) return data.directory.slice(0, 5);
    const q = query.toLowerCase();
    return data.directory.filter(
      (candidate) =>
        candidate.user.displayName.toLowerCase().includes(q) ||
        candidate.user.handle?.toLowerCase().includes(q),
    );
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="labelMedium" style={{ flex: 1 }}>
          Offline
        </Text>
        <Switch value={offline} onValueChange={setOffline} accessibilityLabel="Offline" />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="labelMedium" style={{ flex: 1 }}>
          Limit to 2 mentions
        </Text>
        <Switch value={capped} onValueChange={setCapped} accessibilityLabel="Limit mentions" />
      </View>

      <MentionTextInput
        value={value}
        onChange={setValue}
        searchUsers={searchUsers}
        onMentionSelect={(user) => {
          // The stable id is stored here; the text only carries the handle.
          setMentions((prev) => (prev.some((item) => item.id === user.id) ? prev : [...prev, user]));
          toast.show(`Mentioned ${user.displayName}`);
        }}
        selectedMentions={mentions}
        maxMentions={capped ? 2 : undefined}
        offline={offline}
        label="Write a comment"
        allowedScopes={['people']}
        testID="mention-input"
      />

      <AppCard variant="outlined" title="Resolved mentions (what gets submitted)">
        {mentions.length === 0 ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            None yet — type @ to search.
          </Text>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
              {mentions.map((user) => (
                <Chip
                  key={user.id}
                  compact
                  onClose={() => setMentions((prev) => prev.filter((item) => item.id !== user.id))}
                  closeIconAccessibilityLabel={`Remove mention of ${user.displayName}`}
                >
                  {user.displayName}
                </Chip>
              ))}
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm }} selectable>
              {JSON.stringify(mentions.map((user) => ({ id: user.id, handle: user.handle })))}
            </Text>
          </>
        )}
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm }}>
          Mentions are revalidated server-side at submit — privacy settings and block relationships can change between
          typing and posting.
        </Text>
      </AppCard>
    </ScrollView>
  );
};
