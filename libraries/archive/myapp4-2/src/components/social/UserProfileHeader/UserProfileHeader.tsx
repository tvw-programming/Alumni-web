import React, { memo, useMemo, useState } from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import { Divider, Icon, IconButton, Menu, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { FollowButton } from '../FollowButton/FollowButton';
import { SocialAvatar } from '../primitives/SocialAvatar';
import { RichBody } from '../primitives/RichBody';
import { useSocialTheme } from '../theme/socialTokens';
import type { UserProfile } from '../types/domain';

const formatCount = (value: number): string => {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
};

export interface ProfileOverflowAction {
  key: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  onPress: () => void;
}

export interface UserProfileHeaderProps extends StyleEscapeHatches {
  profile: UserProfile;
  loading?: boolean;
  locale?: string;
  followPending?: boolean;
  followFailed?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onCancelRequest?: () => void;
  onRetryFollow?: () => void;
  onConnect?: () => void;
  onMessage?: () => void;
  onEditProfile?: () => void;
  onPressStat?: (stat: 'posts' | 'followers' | 'following' | 'connections') => void;
  overflowActions?: ProfileOverflowAction[];
}

/**
 * The profile header.
 *
 * Counts are rendered as text buttons with spoken labels — "1.2K followers",
 * not a bare number under an unlabelled column. The follow action never gets
 * pushed off-screen or truncated at large text sizes, because that is the one
 * control the whole screen exists for.
 *
 * A private account shows the header and hides only the content behind it,
 * which is what tells someone whether it is worth requesting access.
 */
export const UserProfileHeader = memo(function UserProfileHeader({
  profile,
  loading = false,
  locale = 'en-IN',
  followPending = false,
  followFailed = false,
  onFollow,
  onUnfollow,
  onCancelRequest,
  onRetryFollow,
  onConnect,
  onMessage,
  onEditProfile,
  onPressStat,
  overflowActions = [],
  style,
  containerStyle,
  testID,
}: UserProfileHeaderProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const id = testID ?? `profile-${profile.user.id}`;
  const blocked = profile.relationship === 'blocked';

  const stats = useMemo(
    () =>
      (
        [
          { key: 'posts' as const, label: 'posts', value: profile.stats.posts },
          { key: 'followers' as const, label: 'followers', value: profile.stats.followers },
          { key: 'following' as const, label: 'following', value: profile.stats.following },
          { key: 'connections' as const, label: 'connections', value: profile.stats.connections },
        ] as const
      ).filter((stat) => stat.value != null),
    [profile.stats],
  );

  if (loading) {
    return (
      <View style={containerStyle} testID={childTestID(id, 'skeleton')}>
        <SkeletonLoader shape="rect" height={110} />
        <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
          <SkeletonLoader shape="circle" height={social.layout.avatarXl} />
          <SkeletonLoader shape="text" lines={2} />
          <SkeletonLoader shape="text" lines={1} height={40} />
        </View>
      </View>
    );
  }

  return (
    <View style={[{ backgroundColor: social.colors.surfaceFeed }, containerStyle, style]} testID={id}>
      {/* Cover art is decorative — no text is ever laid over it. */}
      <View style={[styles.cover, { aspectRatio: social.layout.coverAspectRatio, backgroundColor: theme.colors.surfaceVariant }]}>
        {profile.cover?.uri && !coverFailed ? (
          <Image
            source={{ uri: profile.cover.uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => setCoverFailed(true)}
            accessibilityElementsHidden
          />
        ) : null}
      </View>

      <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md }}>
        <View style={[styles.avatarRow, { marginTop: -social.layout.avatarXl / 2 }]}>
          <View style={[styles.avatarRing, { borderColor: social.colors.surfaceFeed, borderRadius: theme.radii.pill }]}>
            <SocialAvatar user={profile.user} size={social.layout.avatarXl} showPresence />
          </View>

          <View style={styles.flex} />

          {overflowActions.length > 0 ? (
            <Menu
              visible={menuOpen}
              onDismiss={() => setMenuOpen(false)}
              anchor={
                <IconButton
                  icon="dots-horizontal"
                  size={20}
                  onPress={() => setMenuOpen(true)}
                  accessibilityLabel={`More options for ${profile.user.displayName}`}
                  testID={childTestID(id, 'overflow')}
                />
              }
            >
              {overflowActions.map((action) => (
                <Menu.Item
                  key={action.key}
                  title={action.label}
                  leadingIcon={action.icon}
                  titleStyle={action.destructive ? { color: social.colors.statusError } : undefined}
                  onPress={() => {
                    setMenuOpen(false);
                    action.onPress();
                  }}
                  testID={childTestID(id, `action-${action.key}`)}
                />
              ))}
            </Menu>
          ) : null}
        </View>

        <View style={{ gap: 2, marginTop: theme.spacing.xs }}>
          <View style={[styles.row, { gap: 5 }]}>
            {/* Name wraps rather than truncating — identity is not optional. */}
            <Text variant="titleLarge" accessibilityRole="header" style={styles.shrink}>
              {profile.user.displayName}
            </Text>
            {profile.user.verified ? (
              <View style={[styles.row, { gap: 3 }]}>
                <Icon source="check-decagram" size={17} color={social.colors.verified} />
                <Text variant="labelSmall" style={{ color: social.colors.verified }}>
                  Verified
                </Text>
              </View>
            ) : null}
          </View>

          {profile.user.handle ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {profile.user.handle}
            </Text>
          ) : null}

          {profile.headline ? (
            <Text variant="bodyMedium" style={{ marginTop: 2 }}>
              {profile.headline}
            </Text>
          ) : null}

          {profile.organization ? (
            <View style={[styles.row, { gap: 4 }]}>
              <Icon source="office-building-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {profile.organization}
              </Text>
            </View>
          ) : null}
        </View>

        {profile.bio ? (
          <View style={{ marginTop: theme.spacing.xs }}>
            <RichBody body={profile.bio} truncateAt={180} variant="bodySmall" testID={childTestID(id, 'bio')} />
          </View>
        ) : null}

        <View style={[styles.metaRow, { gap: theme.spacing.md, marginTop: theme.spacing.xs }]}>
          {profile.location ? (
            <View style={[styles.row, { gap: 3 }]}>
              <Icon source="map-marker-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {profile.location}
              </Text>
            </View>
          ) : null}

          {profile.websiteUrl ? (
            <TouchableRipple
              onPress={() => void Linking.openURL(profile.websiteUrl as string)}
              accessibilityRole="link"
              accessibilityLabel={`Website, ${profile.websiteUrl}`}
              testID={childTestID(id, 'website')}
            >
              <View style={[styles.row, { gap: 3 }]}>
                <Icon source="link-variant" size={13} color={social.colors.link} />
                <Text variant="labelSmall" style={{ color: social.colors.link }}>
                  {profile.websiteUrl.replace(/^https?:\/\//, '')}
                </Text>
              </View>
            </TouchableRipple>
          ) : null}

          {profile.joinedAt ? (
            <View style={[styles.row, { gap: 3 }]}>
              <Icon source="calendar-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Joined {formatRelativeDate(profile.joinedAt, locale)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Counts are labelled buttons, never bare numbers in a column. */}
        <View style={[styles.statsRow, { gap: theme.spacing.lg, marginTop: theme.spacing.sm }]}>
          {stats.map((stat) => (
            <TouchableRipple
              key={stat.key}
              onPress={onPressStat ? () => onPressStat(stat.key) : undefined}
              disabled={!onPressStat}
              accessibilityRole={onPressStat ? 'button' : 'text'}
              accessibilityLabel={`${(stat.value as number).toLocaleString()} ${stat.label}`}
              testID={childTestID(id, `stat-${stat.key}`)}
            >
              <View style={[styles.row, { gap: 4 }]}>
                <Text variant="labelLarge" style={styles.tabular}>
                  {formatCount(stat.value as number)}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {stat.label}
                </Text>
              </View>
            </TouchableRipple>
          ))}
        </View>

        {profile.mutualCount ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {profile.mutualCount} mutual {profile.mutualCount === 1 ? 'connection' : 'connections'}
          </Text>
        ) : null}

        {profile.statusNote ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: social.colors.surfaceFeedAlt, borderRadius: theme.radii.md, padding: theme.spacing.sm, marginTop: theme.spacing.sm },
            ]}
          >
            <Icon source="information-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6, flex: 1 }}>
              {profile.statusNote}
            </Text>
          </View>
        ) : null}

        {/* Actions wrap rather than shrink — the follow control always fits. */}
        <View style={[styles.actions, { gap: theme.spacing.sm, marginTop: theme.spacing.md }]}>
          {profile.isOwnProfile ? (
            <AppButton
              variant="secondary"
              fullWidth
              onPress={onEditProfile}
              testID={childTestID(id, 'edit')}
            >
              Edit profile
            </AppButton>
          ) : (
            <>
              <View style={styles.flex}>
                <FollowButton
                  targetId={profile.user.id}
                  targetName={profile.user.displayName}
                  relationship={profile.relationship}
                  privacy={profile.privacy}
                  loading={followPending}
                  failed={followFailed}
                  confirmUnfollow
                  fullWidth
                  onFollow={onFollow}
                  onUnfollow={onUnfollow}
                  onCancelRequest={onCancelRequest}
                  onRetry={onRetryFollow}
                  onConnect={onConnect}
                  testID={childTestID(id, 'follow')}
                />
              </View>

              {onMessage && !blocked ? (
                <AppButton
                  variant="secondary"
                  onPress={onMessage}
                  accessibilityLabel={`Message ${profile.user.displayName}`}
                  testID={childTestID(id, 'message')}
                >
                  Message
                </AppButton>
              ) : null}
            </>
          )}
        </View>
      </View>

      {/* Private accounts still show the header — that is how someone decides
          whether to request access. */}
      {profile.privacy === 'private' && profile.relationship !== 'following' && !profile.isOwnProfile ? (
        <StateView
          preset="empty"
          compact
          title="This account is private"
          description={
            profile.relationship === 'requested'
              ? 'Your follow request is pending. You’ll see their posts once it’s accepted.'
              : 'Follow this account to see their posts.'
          }
          testID={childTestID(id, 'private')}
        />
      ) : null}

      {blocked ? (
        <StateView
          preset="empty"
          compact
          title="You blocked this account"
          description="You won’t see their posts, and they can’t message you. You can unblock them from the menu above."
          testID={childTestID(id, 'blocked')}
        />
      ) : null}

      <Divider />
    </View>
  );
});

const styles = StyleSheet.create({
  cover: { width: '100%', overflow: 'hidden' },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-end' },
  avatarRing: { borderWidth: 3 },
  row: { flexDirection: 'row', alignItems: 'center' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center' },
  shrink: { flexShrink: 1 },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
