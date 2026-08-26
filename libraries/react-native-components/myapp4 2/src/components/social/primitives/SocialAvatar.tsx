import React, { memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';

import { useSocialTheme } from '../theme/socialTokens';
import type { Presence, UserSummary } from '../types/domain';

const PRESENCE_META: Record<Presence, { label: string; colorKey: 'statusOnline' | 'statusAway' | 'statusOffline' } | null> = {
  online: { label: 'Online', colorKey: 'statusOnline' },
  away: { label: 'Away', colorKey: 'statusAway' },
  offline: { label: 'Offline', colorKey: 'statusOffline' },
  unknown: null,
};

export interface SocialAvatarProps {
  user: UserSummary;
  size?: number;
  /** Presence dot. Its meaning is carried in the accessible label too. */
  showPresence?: boolean;
  testID?: string;
}

/**
 * Avatar with a fallback chain: image → initials → generic glyph.
 *
 * A broken avatar must never leave an empty circle, because in a message list
 * that is the only thing distinguishing two rows.
 */
export const SocialAvatar = memo(function SocialAvatar({
  user,
  size,
  showPresence = false,
  testID,
}: SocialAvatarProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const [failed, setFailed] = useState(false);

  const dimension = size ?? social.layout.avatarMd;
  const presence = showPresence && user.presence ? PRESENCE_META[user.presence] : null;

  return (
    <View
      style={{ width: dimension, height: dimension }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${user.displayName}${presence ? `, ${presence.label}` : ''}`}
      testID={testID}
    >
      {user.avatar?.uri && !failed ? (
        <Image
          source={{ uri: user.avatar.uri }}
          style={[styles.fill, { borderRadius: theme.radii.pill }]}
          onError={() => setFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.fill,
            styles.center,
            { borderRadius: theme.radii.pill, backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          {user.deleted ? (
            <Icon source="account-off-outline" size={dimension * 0.5} color={theme.colors.onSurfaceVariant} />
          ) : (
            <Text
              variant={dimension > 44 ? 'titleMedium' : 'labelSmall'}
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {initialsOf(user.displayName)}
            </Text>
          )}
        </View>
      )}

      {presence ? (
        <View
          style={[
            styles.presence,
            {
              width: Math.max(8, dimension * 0.28),
              height: Math.max(8, dimension * 0.28),
              borderRadius: theme.radii.pill,
              backgroundColor: social.colors[presence.colorKey],
              borderColor: theme.colors.surface,
            },
          ]}
          testID={childTestID(testID, 'presence')}
        />
      ) : null}
    </View>
  );
});

export interface AuthorLineProps {
  user: UserSummary;
  /** Pre-formatted relative time. */
  timeLabel?: string;
  /** "Sponsored", "Pinned by moderator", "Edited". */
  contextLabel?: string;
  compact?: boolean;
  testID?: string;
}

/**
 * Name, handle, verification and role in one line.
 *
 * Verification and role are text-labelled for assistive tech — a blue tick
 * glyph on its own conveys nothing to a screen reader, and "Creator" as an
 * avatar ring colour conveys nothing to anyone.
 */
export const AuthorLine = memo(function AuthorLine({
  user,
  timeLabel,
  contextLabel,
  compact = false,
  testID,
}: AuthorLineProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();

  return (
    <View style={styles.authorWrap} testID={testID}>
      <View style={[styles.row, { gap: 4 }]}>
        <Text variant={compact ? 'labelMedium' : 'titleSmall'} numberOfLines={1} style={styles.shrink}>
          {user.deleted ? 'Deleted account' : user.displayName}
        </Text>

        {user.verified ? (
          <View style={[styles.row, { gap: 2 }]}>
            <Icon source="check-decagram" size={13} color={social.colors.verified} />
            {/* The word travels with the glyph for screen readers. */}
            <Text variant="labelSmall" style={styles.srOnly} accessibilityElementsHidden={false}>
              Verified
            </Text>
          </View>
        ) : null}

        {user.roleLabel ? (
          <View
            style={[
              styles.roleChip,
              { backgroundColor: social.colors.surfaceSelected, borderRadius: theme.radii.sm },
            ]}
          >
            <Text variant="labelSmall" style={{ color: social.colors.onSurfaceSelected }}>
              {user.roleLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.row, { gap: 4 }]}>
        {user.handle ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
            {user.handle}
          </Text>
        ) : null}
        {timeLabel ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {user.handle ? '· ' : ''}
            {timeLabel}
          </Text>
        ) : null}
        {contextLabel ? (
          <Text variant="labelSmall" style={{ color: social.colors.sponsored }}>
            · {contextLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  center: { alignItems: 'center', justifyContent: 'center' },
  presence: { position: 'absolute', right: -1, bottom: -1, borderWidth: 2 },
  authorWrap: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  shrink: { flexShrink: 1 },
  roleChip: { paddingHorizontal: 5, paddingVertical: 1 },
  // Visually tiny but present in the accessibility tree.
  srOnly: { fontSize: 1, opacity: 0, width: 1, height: 1 },
});
