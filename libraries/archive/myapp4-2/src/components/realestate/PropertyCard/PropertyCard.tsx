import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Chip, Icon, IconButton, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { PropertyCardVariant, PropertySummary } from '../types/domain';
import { PropertyStatusChip } from '../PropertyStatusChip/PropertyStatusChip';

export interface PropertyCardProps extends StyleEscapeHatches {
  property: PropertySummary;
  variant?: PropertyCardVariant;
  loading?: boolean;
  showCarousel?: boolean;
  showAmenities?: boolean;
  saved?: boolean;
  savingWatchlist?: boolean;
  onPress: (property: PropertySummary) => void;
  onToggleSave?: (property: PropertySummary) => void;
  onContact?: (property: PropertySummary) => void;
}

/**
 * Six-plus chips never pile onto this card — high-value metadata only, per
 * the spec. Favorite and contact stay separate tap targets from the card's
 * own press handler, and a sold or unavailable listing stays visible with
 * an honest status chip rather than disappearing from a saved list.
 */
export const PropertyCard = ({
  property,
  variant = 'grid',
  loading = false,
  showCarousel = true,
  showAmenities = true,
  saved = false,
  savingWatchlist = false,
  onPress,
  onToggleSave,
  onContact,
  style,
  containerStyle,
  testID,
}: PropertyCardProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? `property-${property.id}`;
  const [imageIndex, setImageIndex] = useState(0);
  const unavailable = property.status === 'sold' || property.status === 'rented';
  const compact = variant === 'list' || variant === 'map';

  if (loading) {
    return (
      <AppCard variant="outlined" padded={false} containerStyle={containerStyle} testID={childTestID(id, 'loading')}>
        <SkeletonLoader shape="rect" height={realestate.layout.cardImageHeight} />
        <View style={{ padding: theme.spacing.sm }}>
          <SkeletonLoader shape="text" lines={3} />
        </View>
      </AppCard>
    );
  }

  const a11yLabel = `${property.title}, ${property.bhk ? `${property.bhk}, ` : ''}${property.areaLabel ? `${property.areaLabel}, ` : ''}${formatMoney(property.price, { locale: 'en-IN' })}${
    property.priceUnit === 'perMonth' ? ' per month' : ''
  }, ${property.locality}, ${property.city}${property.status ? `, ${property.status}` : ''}${unavailable ? '' : ''}`;

  return (
    <AppCard variant="outlined" padded={false} containerStyle={containerStyle} style={style} testID={id}>
      <View style={compact ? styles.rowLayout : undefined}>
        <TouchableRipple onPress={() => onPress(property)} accessibilityRole="button" accessibilityLabel={a11yLabel} style={compact ? styles.compactMediaWrap : undefined}>
          <View style={[styles.mediaBox, compact ? { height: 96, width: 120 } : { height: realestate.layout.cardImageHeight }, { backgroundColor: realestate.colors.surfaceVariant }]}>
            {property.images.length > 0 && property.images[imageIndex]?.uri ? (
              <Image source={{ uri: property.images[imageIndex]!.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityElementsHidden />
            ) : (
              <View style={styles.fallback}>
                <Icon source="home-city-outline" size={26} color={realestate.colors.onSurfaceVariant} />
              </View>
            )}

            {showCarousel && property.images.length > 1 ? (
              <View style={styles.dotsRow} pointerEvents="none">
                {property.images.map((_, index) => (
                  <View key={index} style={[styles.dot, { backgroundColor: index === imageIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }]} />
                ))}
              </View>
            ) : null}

            {property.sponsored ? (
              <View style={[styles.sponsoredBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                <Text variant="labelSmall" style={{ color: '#FFFFFF' }}>
                  Featured
                </Text>
              </View>
            ) : null}

            {unavailable ? (
              <View style={[StyleSheet.absoluteFillObject, styles.unavailableOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]} pointerEvents="none">
                <PropertyStatusChip status={property.status!} compact />
              </View>
            ) : null}

            {onToggleSave ? (
              <IconButton
                icon={saved ? 'heart' : 'heart-outline'}
                iconColor={saved ? realestate.colors.priceReduced : '#FFFFFF'}
                containerColor="rgba(0,0,0,0.35)"
                size={16}
                loading={savingWatchlist}
                onPress={() => onToggleSave(property)}
                accessibilityLabel={saved ? `Remove ${property.title} from saved` : `Save ${property.title}`}
                accessibilityState={{ selected: saved }}
                style={styles.saveButton}
                testID={childTestID(id, 'save')}
              />
            ) : null}
          </View>
        </TouchableRipple>

        <View style={[styles.content, { padding: theme.spacing.sm }, compact ? styles.flex : undefined]}>
          <View style={styles.row}>
            <Text variant="titleSmall" style={styles.flex}>
              {formatMoney(property.price, { locale: 'en-IN' })}
              {property.priceUnit === 'perMonth' ? '/mo' : ''}
            </Text>
            {property.verified ? <Icon source="shield-check" size={15} color={realestate.colors.verified} /> : null}
          </View>

          <Text variant="bodyMedium" numberOfLines={1}>
            {[property.bhk, property.areaLabel, property.propertyType].filter(Boolean).join(' · ')}
          </Text>

          <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }} numberOfLines={1}>
            {property.locality}, {property.city}
          </Text>

          {property.status && !unavailable ? (
            <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
              <PropertyStatusChip status={property.status} />
            </View>
          ) : null}

          {showAmenities && property.amenityHighlights && property.amenityHighlights.length > 0 ? (
            <View style={styles.chipRow}>
              {property.amenityHighlights.slice(0, 3).map((amenity) => (
                <Chip key={amenity} compact mode="outlined" style={styles.chip} textStyle={styles.chipText}>
                  {amenity}
                </Chip>
              ))}
            </View>
          ) : null}

          {property.freshness?.status === 'stale' ? (
            <View style={styles.row}>
              <Icon source="clock-alert-outline" size={12} color={realestate.colors.warning} />
              <Text variant="labelSmall" style={{ color: realestate.colors.warning, marginLeft: 3 }}>
                Listing details may be out of date
              </Text>
            </View>
          ) : null}

          {onContact && !unavailable ? (
            <AppButton variant="secondary" size="sm" containerStyle={{ marginTop: 6 }} onPress={() => onContact(property)} testID={childTestID(id, 'contact')}>
              {property.listedBy === 'owner' ? 'Contact owner' : 'Schedule a visit'}
            </AppButton>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  rowLayout: { flexDirection: 'row' },
  compactMediaWrap: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8, overflow: 'hidden' },
  mediaBox: { width: '100%', overflow: 'hidden' },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  dotsRow: { position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  sponsoredBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  unavailableOverlay: { alignItems: 'center', justifyContent: 'center' },
  saveButton: { position: 'absolute', top: 4, right: 4, margin: 0 },
  content: { gap: 3 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  chip: { height: 24 },
  chipText: { fontSize: 10, marginVertical: 0, lineHeight: 12 },
});
