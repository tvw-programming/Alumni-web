import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useRideTheme } from '../theme/transportationTokens';
import type { RideOption } from '../types/domain';

export interface RideTypeSelectorProps extends StyleEscapeHatches {
  options: RideOption[];
  selectedId?: string;
  orientation?: 'horizontal' | 'vertical';
  showCapacity?: boolean;
  showFare?: boolean;
  showEta?: boolean;
  loading?: boolean;
  locale?: string;
  onSelect: (option: RideOption) => void;
  onViewDetails?: (option: RideOption) => void;
}

/**
 * Price and ETA render together, deliberately — a rider choosing between
 * "cheaper" and "faster" should never have to tap into a second screen to see
 * both. An unavailable ride type stays in the list with a reason rather than
 * disappearing, so the rider understands what changed.
 */
export const RideTypeSelector = ({
  options,
  selectedId,
  orientation = 'horizontal',
  showCapacity = true,
  showFare = true,
  showEta = true,
  loading = false,
  locale = 'en-IN',
  onSelect,
  onViewDetails,
  style,
  containerStyle,
  testID,
}: RideTypeSelectorProps) => {
  const theme = useAppTheme();
  const ride = useRideTheme();
  const id = testID ?? 'ride-type-selector';

  if (loading) {
    return (
      <View style={[{ flexDirection: 'row', gap: theme.spacing.sm }, containerStyle, style]} testID={childTestID(id, 'loading')}>
        {[1, 2, 3].map((i) => (
          <SkeletonLoader key={i} shape="rect" height={120} containerStyle={{ width: ride.layout.rideCardMinWidth }} />
        ))}
      </View>
    );
  }

  const content = options.map((option) => (
    <RideCard
      key={option.id}
      option={option}
      selected={selectedId === option.id}
      showCapacity={showCapacity}
      showFare={showFare}
      showEta={showEta}
      locale={locale}
      onSelect={onSelect}
      onViewDetails={onViewDetails}
      testID={childTestID(id, option.id)}
    />
  ));

  if (orientation === 'vertical') {
    return (
      <View style={[{ gap: theme.spacing.sm }, containerStyle, style]} accessibilityRole="radiogroup" testID={id}>
        {content}
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[{ gap: theme.spacing.sm }, containerStyle]}
      style={style}
      accessibilityRole="radiogroup"
      testID={id}
    >
      {content}
    </ScrollView>
  );
};

const RideCard = ({
  option,
  selected,
  showCapacity,
  showFare,
  showEta,
  locale,
  onSelect,
  onViewDetails,
  testID,
}: {
  option: RideOption;
  selected: boolean;
  showCapacity: boolean;
  showFare: boolean;
  showEta: boolean;
  locale: string;
  onSelect: (option: RideOption) => void;
  onViewDetails?: (option: RideOption) => void;
  testID?: string;
}) => {
  const theme = useAppTheme();
  const ride = useRideTheme();
  const unavailable = option.availability === 'unavailable';

  const a11yLabel = `${option.name}${option.capacity ? `, ${option.capacity} seats` : ''}${
    option.eta ? `, pickup in ${option.eta}` : ''
  }${option.fare ? `, ${formatMoney(option.fare, { locale })}` : option.fareLabel ? `, ${option.fareLabel}` : ''}${
    unavailable ? ', no cars nearby' : ''
  }`;

  return (
    <TouchableRipple
      onPress={unavailable ? undefined : () => onSelect(option)}
      disabled={unavailable}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: unavailable }}
      accessibilityLabel={a11yLabel}
      style={[
        styles.card,
        {
          minWidth: ride.layout.rideCardMinWidth,
          borderRadius: theme.radii.md,
          borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          backgroundColor: selected ? ride.colors.surfaceSelected : theme.colors.surface,
          opacity: unavailable ? 0.55 : 1,
        },
      ]}
      testID={testID}
    >
      <View style={{ padding: theme.spacing.sm, gap: 2 }}>
        <View style={styles.row}>
          <Icon source={option.icon} size={28} color={theme.colors.onSurface} />
          {option.recommended ? (
            <View style={[styles.badge, { backgroundColor: ride.colors.surfaceSelected, borderRadius: theme.radii.pill }]}>
              <Text variant="labelSmall" style={{ color: ride.colors.recommended }}>
                Best value
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="titleSmall">{option.name}</Text>
        {showCapacity && option.capacity ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {option.capacity} seats
          </Text>
        ) : null}
        {option.description ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
            {option.description}
          </Text>
        ) : null}

        {unavailable ? (
          <Text variant="labelSmall" style={{ color: ride.colors.unavailable, marginTop: 2 }}>
            No cars nearby
          </Text>
        ) : (
          <>
            {showEta && option.eta ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                Pickup in {option.eta}
              </Text>
            ) : null}
            {showFare ? (
              <Text variant="titleSmall" style={{ marginTop: 2 }}>
                {option.fare ? formatMoney(option.fare, { locale }) : (option.fareLabel ?? '—')}
              </Text>
            ) : null}
          </>
        )}

        {option.availability === 'limited' ? (
          <Text variant="labelSmall" style={{ color: ride.colors.limitedAvailability }}>
            Few cars nearby
          </Text>
        ) : null}

        {onViewDetails ? (
          <Text
            variant="labelSmall"
            onPress={() => onViewDetails(option)}
            accessibilityRole="button"
            accessibilityLabel={`View details for ${option.name}`}
            style={{ color: theme.colors.primary, marginTop: 2 }}
          >
            Details
          </Text>
        ) : null}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 6, paddingVertical: 1 },
});
