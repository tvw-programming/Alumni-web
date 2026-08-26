/**
 * USAGE — UserProfileHeader
 *
 * The "long name" case is worth checking: identity wraps rather than truncating,
 * and the follow action still fits. Truncating someone's name to keep a button
 * on one line is the wrong trade.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Relationship, UserProfile } from '../types/domain';
import { UserProfileHeader } from './UserProfileHeader';
import sample from './UserProfileHeader.sample.json';

const { profiles } = loadSample<{ profiles: Record<string, UserProfile> }>(sample);
type Key = keyof typeof profiles;

export const UserProfileHeaderUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [key, setKey] = useState<Key>('creator');
  const [relationships, setRelationships] = useState<Record<string, Relationship>>({});
  const [pending, setPending] = useState(false);

  const profile = profiles[key]!;
  const relationship = relationships[profile.user.id] ?? profile.relationship;

  const mutate = useCallback(async (userId: string, next: Relationship) => {
    setPending(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setPending(false);
    setRelationships((prev) => ({ ...prev, [userId]: next }));
  }, []);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <SegmentedButtons
          value={key}
          onValueChange={(next) => setKey(next as Key)}
          density="small"
          buttons={[
            { value: 'creator', label: 'Creator' },
            { value: 'professional', label: 'Pro' },
            { value: 'privateNotFollowed', label: 'Private' },
            { value: 'blocked', label: 'Blocked' },
          ]}
        />
        <SegmentedButtons
          value={key}
          onValueChange={(next) => setKey(next as Key)}
          density="small"
          buttons={[
            { value: 'following', label: 'Following' },
            { value: 'privateRequested', label: 'Requested' },
            { value: 'ownProfile', label: 'Mine' },
            { value: 'longName', label: 'Long name' },
          ]}
        />
      </View>

      <UserProfileHeader
        profile={{ ...profile, relationship }}
        followPending={pending}
        onFollow={() => void mutate(profile.user.id, profile.privacy === 'private' ? 'requested' : 'following')}
        onUnfollow={() => void mutate(profile.user.id, 'none')}
        onCancelRequest={() => void mutate(profile.user.id, 'none')}
        onConnect={key === 'professional' ? () => toast.show('Connection request sent') : undefined}
        onMessage={() => toast.show('Opening the conversation')}
        onEditProfile={() => toast.show('Opening profile editor')}
        onPressStat={(stat) => toast.show(`Opening ${stat}`)}
        overflowActions={[
          { key: 'share', label: 'Share this profile', icon: 'share-variant', onPress: () => toast.show('Sharing') },
          { key: 'mute', label: 'Mute', icon: 'volume-off', onPress: () => toast.show('Muted') },
          { key: 'block', label: relationship === 'blocked' ? 'Unblock' : 'Block', icon: 'block-helper', destructive: true, onPress: () => toast.show('Opening block sheet') },
          { key: 'report', label: 'Report account', icon: 'flag-outline', destructive: true, onPress: () => toast.show('Opening report sheet') },
        ]}
      />

      <View style={{ padding: theme.spacing.md }}>
        <Text variant="labelLarge">Loading</Text>
      </View>
      <UserProfileHeader profile={profile} loading testID="profile-loading" />
    </ScrollView>
  );
};
