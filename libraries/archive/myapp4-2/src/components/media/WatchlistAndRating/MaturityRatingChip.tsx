import React from 'react';
import { Chip, Text } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useStreamingTheme } from '../theme/mediaTokens';

export interface MaturityRatingChipProps extends StyleEscapeHatches {
  rating: string;
  descriptors?: string[];
  restricted?: boolean;
  onPress?: () => void;
}

/**
 * Restriction is never colour-only — a restricted rating always pairs its
 * background with the word "Restricted" and, when provided, real content
 * descriptors (violence, language) rather than a bare code the market
 * requires context for.
 */
export const MaturityRatingChip = ({ rating, descriptors = [], restricted = false, onPress, style, containerStyle, testID }: MaturityRatingChipProps) => {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const id = testID ?? 'maturity-rating-chip';

  const a11yLabel = `Content rating: ${rating}${descriptors.length ? `, ${descriptors.join(', ')}` : ''}${restricted ? ', restricted for this profile' : ''}`;

  return (
    <View style={[containerStyle, style]} testID={id}>
      <Chip
        compact
        mode="flat"
        onPress={onPress}
        style={{ backgroundColor: restricted ? media.colors.restrictedContainer : theme.colors.surfaceVariant }}
        textStyle={{ color: restricted ? media.colors.onRestrictedContainer : theme.colors.onSurfaceVariant, fontSize: 11 }}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={a11yLabel}
        testID={childTestID(id, 'chip')}
      >
        {rating}
      </Chip>
      {restricted ? (
        <Text variant="labelSmall" style={{ color: media.colors.restricted, marginTop: 2 }}>
          Restricted for this profile
        </Text>
      ) : null}
      {descriptors.length > 0 ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {descriptors.join(' · ')}
        </Text>
      ) : null}
    </View>
  );
};
