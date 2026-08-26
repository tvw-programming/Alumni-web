import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Avatar, Text, TouchableRipple } from 'react-native-paper';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useStreamingTheme } from '../theme/mediaTokens';
import type { CastCrewPerson } from '../types/domain';

const ROLE_PREFIX: Record<CastCrewPerson['type'], string> = {
  cast: 'Starring',
  crew: 'Directed by',
  creator: 'Created by',
};

export interface CastCrewStripProps extends StyleEscapeHatches {
  title?: string;
  people: CastCrewPerson[];
  loading?: boolean;
  onPersonPress?: (personId: string) => void;
  onSeeAll?: () => void;
}

/**
 * A missing headshot falls back to initials, never a blank tile — a portrait
 * too small to recognize a face is still a real name and role a screen
 * reader can announce in full.
 */
export const CastCrewStrip = ({ title = 'Cast & Crew', people, loading = false, onPersonPress, onSeeAll, style, containerStyle, testID }: CastCrewStripProps) => {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const id = testID ?? 'cast-crew-strip';

  if (loading) {
    return (
      <View style={[containerStyle, style]} testID={childTestID(id, 'loading')}>
        <Text variant="titleSmall" style={{ marginBottom: 8, color: media.colors.onSurface }}>
          {title}
        </Text>
        <View style={styles.row}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} shape="circle" width={media.layout.castAvatarSize} height={media.layout.castAvatarSize} containerStyle={{ marginRight: 12 }} />
          ))}
        </View>
      </View>
    );
  }

  if (people.length === 0) {
    return (
      <View style={[containerStyle, style]} testID={id}>
        <StateView preset="empty" compact title="No cast information available" />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View style={styles.headerRow}>
        <Text variant="titleSmall" style={{ color: media.colors.onSurface }}>
          {title}
        </Text>
        {onSeeAll ? (
          <Text variant="labelMedium" onPress={onSeeAll} accessibilityRole="button" style={{ color: theme.colors.primary }} testID={childTestID(id, 'see-all')}>
            See all
          </Text>
        ) : null}
      </View>

      <FlatList
        horizontal
        data={people}
        keyExtractor={(person) => person.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingVertical: 8 }}
        renderItem={({ item }) => (
          <TouchableRipple
            onPress={onPersonPress ? () => onPersonPress(item.id) : undefined}
            disabled={!onPersonPress}
            accessibilityRole={onPersonPress ? 'button' : 'text'}
            accessibilityLabel={`${item.name}, ${ROLE_PREFIX[item.type]}${item.character ? `, plays ${item.character}` : ''}`}
            style={styles.person}
            testID={childTestID(id, item.id)}
          >
            <View style={{ alignItems: 'center', width: media.layout.castAvatarSize + 20 }}>
              {item.avatar?.uri ? (
                <Avatar.Image size={media.layout.castAvatarSize} source={{ uri: item.avatar.uri }} />
              ) : (
                <Avatar.Text size={media.layout.castAvatarSize} label={initialsOf(item.name)} />
              )}
              <Text variant="labelMedium" numberOfLines={1} style={styles.name}>
                {item.name}
              </Text>
              <Text variant="labelSmall" numberOfLines={1} style={{ color: media.colors.onSurfaceVariant, textAlign: 'center' }}>
                {item.character ?? ROLE_PREFIX[item.type]}
              </Text>
            </View>
          </TouchableRipple>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row' },
  person: { alignItems: 'center' },
  name: { marginTop: 6, textAlign: 'center' },
});
