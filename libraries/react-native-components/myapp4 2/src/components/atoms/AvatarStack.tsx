import React, { forwardRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';

import type { Size, StyleEscapeHatches } from '../primitives';

export interface AvatarUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface AvatarStackProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering'> {
  users: AvatarUser[];
  max?: number;
  size?: Size;
  /** Fraction of the avatar width that each one overlaps the previous. */
  overlap?: number;
  showOverflow?: boolean;
  onPress?: () => void;
}

export const AvatarStack = forwardRef<View, AvatarStackProps>(function AvatarStack(
  {
    users,
    max = 4,
    size = 'md',
    overlap = 0.35,
    showOverflow = true,
    onPress,
    animated = true,
    entering = 'slideRight',
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const motion = useMotion({ animated });

  const avatarSize = theme.sizing.avatar[size];
  const shift = -Math.round(avatarSize * overlap);
  const visible = users.slice(0, max);
  const overflow = users.length - visible.length;

  const label =
    users.length === 0
      ? 'No people'
      : `${visible.map((u) => u.name).join(', ')}${overflow > 0 ? ` and ${overflow} more` : ''}`;

  const body = (
    <View style={[styles.row, containerStyle, style]}>
      {visible.map((user, i) => (
        <Animated.View
          key={user.id}
          entering={motion.entering(entering, i)}
          style={{
            marginLeft: i === 0 ? 0 : shift,
            borderRadius: theme.radii.pill,
            borderWidth: 2,
            borderColor: theme.colors.background,
            zIndex: visible.length - i,
          }}
        >
          {user.avatarUrl ? (
            <Avatar.Image size={avatarSize} source={{ uri: user.avatarUrl }} />
          ) : (
            <Avatar.Text size={avatarSize} label={initialsOf(user.name)} />
          )}
        </Animated.View>
      ))}

      {showOverflow && overflow > 0 && (
        <Animated.View
          entering={motion.entering(entering, visible.length)}
          style={[
            styles.overflow,
            {
              marginLeft: shift,
              width: avatarSize,
              height: avatarSize,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.background,
            },
          ]}
          testID={childTestID(testID, 'overflow')}
        >
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            +{overflow}
          </Text>
        </Animated.View>
      )}
    </View>
  );

  if (!onPress) {
    return (
      <View ref={ref} accessibilityRole="image" accessibilityLabel={label} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      {body}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  overflow: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
