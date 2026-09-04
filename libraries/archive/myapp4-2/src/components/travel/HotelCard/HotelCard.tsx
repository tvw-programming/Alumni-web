import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text, TouchableRipple } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useTravelTheme } from '../theme/travelTokens';
import type { HotelCardData } from '../types/domain';
import { PropertyMedia } from './PropertyMedia';

export type HotelCardVariant = 'grid' | 'list';

export interface HotelCardProps extends StyleEscapeHatches {
  hotel: HotelCardData;
  variant?: HotelCardVariant;
  locale?: string;
  loading?: boolean;
  onPress?: (hotel: HotelCardData) => void;
  onFavoriteToggle?: (hotel: HotelCardData, next: boolean) => void;
  onViewRooms?: (hotel: HotelCardData) => void;
}

const AVAILABILITY_COPY: Partial<Record<HotelCardData['availability'], { label: string; icon: string }>> = {
  limited: { label: 'Only a few rooms left', icon: 'alert-outline' },
  soldOut: { label: 'No rooms available for these dates', icon: 'close-circle-outline' },
  unknown: { label: 'Check availability', icon: 'help-circle-outline' },
};

/**
 * Media-led result card. Price and cancellation status sit right beside the
 * action so a traveler never has to scan the whole card to make a decision —
 * and "Free cancellation" is never shown without the deadline that makes it
 * true.
 */
export const HotelCard = ({
  hotel,
  variant = 'grid',
  locale = 'en-IN',
  loading = false,
  onPress,
  onFavoriteToggle,
  onViewRooms,
  style,
  containerStyle,
  testID,
}: HotelCardProps) => {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  const id = testID ?? `hotel-${hotel.id}`;

  const soldOut = hotel.availability === 'soldOut';
  const availabilityNote = AVAILABILITY_COPY[hotel.availability];

  const amenityPreview = useMemo(() => (hotel.amenities ?? []).slice(0, 3), [hotel.amenities]);

  if (loading) {
    return (
      <AppCard variant="outlined" padded={false} containerStyle={containerStyle} testID={childTestID(id, 'loading')}>
        <SkeletonLoader shape="rect" height={travel.layout.propertyImageHeight} />
        <View style={{ padding: theme.spacing.md }}>
          <SkeletonLoader shape="text" lines={3} />
        </View>
      </AppCard>
    );
  }

  return (
    <AppCard variant="outlined" padded={false} containerStyle={containerStyle} style={style} testID={id}>
      <TouchableRipple onPress={() => onPress?.(hotel)} disabled={!onPress} accessibilityRole="button" accessibilityLabel={hotel.name}>
        <View>
          <PropertyMedia
            image={hotel.images[0]}
            testID={childTestID(id, 'media')}
            overlay={
              onFavoriteToggle ? (
                <IconButton
                  icon={hotel.favorited ? 'heart' : 'heart-outline'}
                  iconColor={hotel.favorited ? travel.colors.guestFavorite : theme.colors.onSurface}
                  containerColor="rgba(255,255,255,0.85)"
                  size={18}
                  onPress={() => onFavoriteToggle(hotel, !hotel.favorited)}
                  accessibilityLabel={hotel.favorited ? 'Remove from favorites' : 'Add to favorites'}
                  accessibilityState={{ selected: hotel.favorited }}
                  testID={childTestID(id, 'favorite')}
                />
              ) : undefined
            }
          />

          <View style={{ padding: theme.spacing.md, gap: 4 }}>
            <View style={styles.row}>
              <Text variant="titleSmall" numberOfLines={1} style={styles.flex}>
                {hotel.name}
              </Text>
              {hotel.guestFavorite ? (
                <View style={[styles.badge, { backgroundColor: travel.colors.surfaceSelected, borderRadius: theme.radii.pill }]}>
                  <Text variant="labelSmall" style={{ color: travel.colors.onSurfaceSelected }}>
                    Guest favorite
                  </Text>
                </View>
              ) : null}
            </View>

            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {hotel.propertyType ? `${hotel.propertyType} · ` : ''}
              {hotel.location}
            </Text>

            {hotel.rating ? (
              <View style={styles.row}>
                <View style={[styles.scoreChip, { backgroundColor: theme.colors.primaryContainer, borderRadius: theme.radii.sm }]}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                    {hotel.rating.average.toFixed(1)}
                  </Text>
                </View>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
                  {hotel.rating.count} review{hotel.rating.count === 1 ? '' : 's'}
                </Text>
              </View>
            ) : null}

            {amenityPreview.length > 0 ? (
              <View style={[styles.row, { flexWrap: 'wrap', gap: 6, marginTop: 2 }]}>
                {amenityPreview.map((amenity) => (
                  <View key={amenity.id} style={[styles.chip, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}>
                    <Icon source={amenity.icon} size={12} color={theme.colors.onSurfaceVariant} />
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                      {amenity.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {hotel.cancellation ? (
              <View style={[styles.row, { marginTop: 4 }]}>
                <Icon
                  source={hotel.cancellation.type === 'free' ? 'calendar-check-outline' : 'calendar-remove-outline'}
                  size={13}
                  color={hotel.cancellation.type === 'free' ? travel.colors.freeCancellation : theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="labelSmall"
                  style={{ color: hotel.cancellation.type === 'free' ? travel.colors.freeCancellation : theme.colors.onSurfaceVariant, marginLeft: 4, flex: 1 }}
                  numberOfLines={1}
                >
                  {hotel.cancellation.summary}
                </Text>
              </View>
            ) : null}

            {availabilityNote ? (
              <View style={styles.row}>
                <Icon source={availabilityNote.icon} size={13} color={soldOut ? travel.colors.soldOut : travel.colors.limitedAvailability} />
                <Text
                  variant="labelSmall"
                  style={{ color: soldOut ? travel.colors.soldOut : travel.colors.limitedAvailability, marginLeft: 4 }}
                >
                  {availabilityNote.label}
                </Text>
              </View>
            ) : null}

            <View style={[styles.row, { justifyContent: 'space-between', marginTop: 6 }]}>
              <View>
                {hotel.price ? (
                  <>
                    <Text variant="titleMedium">{formatMoney(hotel.price, { locale })}</Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      per night{hotel.totalPrice && hotel.nights ? ` · ${formatMoney(hotel.totalPrice, { locale })} for ${hotel.nights} nights` : ''}
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Taxes and fees may apply
                    </Text>
                  </>
                ) : (
                  <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    Price unavailable
                  </Text>
                )}
              </View>
              {onViewRooms ? (
                <Text
                  variant="labelLarge"
                  onPress={soldOut ? undefined : () => onViewRooms(hotel)}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: soldOut }}
                  style={{ color: soldOut ? theme.colors.onSurfaceDisabled : theme.colors.primary }}
                  testID={childTestID(id, 'view-rooms')}
                >
                  View rooms
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableRipple>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, marginLeft: 6 },
  scoreChip: { paddingHorizontal: 6, paddingVertical: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3 },
});
