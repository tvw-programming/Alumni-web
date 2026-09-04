/**
 * USAGE — FollowButton
 *
 * The live example runs real optimistic transitions. Following a private account
 * lands on "Requested", not "Following" — presenting a pending request as an
 * established relationship is the bug this component is designed to prevent.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Divider, Switch, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Relationship } from '../types/domain';
import { FollowButton } from './FollowButton';
import sample from './FollowButton.sample.json';

interface Target {
  targetId: string;
  targetName: string;
  relationship: Relationship;
  privacy: 'public' | 'private';
  note: string;
}

const { targets } = loadSample<{ targets: Target[] }>(sample);

export const FollowButtonUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [relationships, setRelationships] = useState<Record<string, Relationship>>(
    Object.fromEntries(targets.map((target) => [target.targetId, target.relationship])),
  );
  const [pending, setPending] = useState<string>();
  const [failedId, setFailedId] = useState<string>();
  const [failNext, setFailNext] = useState(false);

  const mutate = useCallback(
    async (target: Target, next: Relationship) => {
      const previous = relationships[target.targetId]!;
      setPending(target.targetId);
      setFailedId(undefined);

      await new Promise((resolve) => setTimeout(resolve, 700));
      setPending(undefined);

      if (failNext) {
        setRelationships((prev) => ({ ...prev, [target.targetId]: previous }));
        setFailedId(target.targetId);
        return;
      }
      setRelationships((prev) => ({ ...prev, [target.targetId]: next }));
    },
    [failNext, relationships],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="labelMedium" style={{ flex: 1 }}>
          Make the next action fail
        </Text>
        <Switch value={failNext} onValueChange={setFailNext} accessibilityLabel="Simulate a failed follow" />
      </View>

      {targets.map((target) => {
        const relationship = relationships[target.targetId]!;
        return (
          <View key={target.targetId} style={{ gap: 4 }}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {target.targetName} · {target.note}
            </Text>
            <FollowButton
              targetId={target.targetId}
              targetName={target.targetName}
              relationship={relationship}
              privacy={target.privacy}
              loading={pending === target.targetId}
              failed={failedId === target.targetId}
              confirmUnfollow
              onFollow={() => void mutate(target, target.privacy === 'private' ? 'requested' : 'following')}
              onUnfollow={() => void mutate(target, 'none')}
              onCancelRequest={() => void mutate(target, 'none')}
              onRetry={() => void mutate(target, target.privacy === 'private' ? 'requested' : 'following')}
            />
            <Divider />
          </View>
        );
      })}

      <Text variant="labelLarge">Follow and Connect as separate relationships</Text>
      <FollowButton
        targetId="u-11"
        targetName="Sara Whitfield"
        relationship="none"
        onFollow={() => toast.show('Now following')}
        onConnect={() => toast.show('Connection request sent')}
        testID="follow-connect"
      />

      <Text variant="labelLarge">Full width (profile header)</Text>
      <FollowButton
        targetId="u-12"
        targetName="Maya Iyer"
        relationship="following"
        fullWidth
        confirmUnfollow
        onUnfollow={() => toast.show('Unfollowed')}
        testID="follow-full"
      />
    </ScrollView>
  );
};
