import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, RadioButton, Text, TouchableRipple } from 'react-native-paper';

import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useTravelTheme } from '../theme/travelTokens';
import type { RoomRate } from '../types/domain';

const PAYMENT_LABEL: Record<NonNullable<RoomRate['paymentTiming']>, string> = {
  now: 'Pay now',
  later: 'Pay later',
  atProperty: 'Pay at property',
};

export interface RoomTypeCardProps extends StyleEscapeHatches {
  room: RoomRate;
  selected?: boolean;
  locale?: string;
  onSelect?: (room: RoomRate) => void;
}

/**
 * A radio-selection row, not a card that happens to have a radio in it — the
 * selected state is unmistakable through the control, the border, the fill,
 * and a text summary together, never colour alone. Room type and rate plan
 * are shown as one unit: this card never claims a room is "available" when
 * only one particular rate plan actually is.
 */
export const RoomTypeCard = ({ room, selected = false, locale = 'en-IN', onSelect, style, containerStyle, testID }: RoomTypeCardProps) => {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  const id = testID ?? `room-${room.id}`;
  const unavailable = room.availability === 'unavailable';
  const image = room.images?.[0];

  return (
    <TouchableRipple
      onPress={unavailable ? undefined : () => onSelect?.(room)}
      disabled={unavailable || !onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: unavailable }}
      accessibilityLabel={`${room.roomName}, ${formatMoney(room.price, { locale })}${unavailable ? ', unavailable' : ''}`}
      style={[
        styles.root,
        {
          borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          borderRadius: theme.radii.md,
          backgroundColor: selected ? travel.colors.surfaceSelected : theme.colors.surface,
          opacity: unavailable ? 0.6 : 1,
        },
        containerStyle,
        style,
      ]}
      testID={id}
    >
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.xs }}>
        <View style={styles.row}>
          <RadioButton value={room.id} status={selected ? 'checked' : 'unchecked'} disabled={unavailable} onPress={() => onSelect?.(room)} />
          {image?.uri ? (
            <Image source={{ uri: image.uri }} style={[styles.thumb, { borderRadius: theme.radii.sm }]} accessibilityElementsHidden />
          ) : null}
          <View style={styles.flex}>
            <Text variant="titleSmall">{room.roomName}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {[room.beds, `Sleeps ${room.maxGuests}`, room.size].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        {room.inclusions.length > 0 ? (
          <View style={[styles.row, { flexWrap: 'wrap', gap: 6 }]}>
            {room.inclusions.map((inclusion) => (
              <View key={inclusion.id} style={styles.row}>
                <Icon source={inclusion.icon ?? 'check'} size={13} color={travel.colors.freeCancellation} />
                <Text variant="labelSmall" style={{ marginLeft: 3, color: theme.colors.onSurfaceVariant }}>
                  {inclusion.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.row}>
          <Icon
            source={room.cancellation.type === 'free' ? 'calendar-check-outline' : 'calendar-remove-outline'}
            size={13}
            color={room.cancellation.type === 'free' ? travel.colors.freeCancellation : room.cancellation.type === 'nonRefundable' ? travel.colors.nonRefundable : travel.colors.partialRefund}
          />
          <Text
            variant="labelSmall"
            style={{
              marginLeft: 4,
              color: room.cancellation.type === 'free' ? travel.colors.freeCancellation : room.cancellation.type === 'nonRefundable' ? travel.colors.nonRefundable : travel.colors.partialRefund,
            }}
          >
            {room.cancellation.summary}
          </Text>
        </View>

        {room.availability === 'limited' ? (
          <View style={styles.row}>
            <Icon source="alert-outline" size={13} color={travel.colors.limitedAvailability} />
            <Text variant="labelSmall" style={{ color: travel.colors.limitedAvailability, marginLeft: 4 }}>
              Only 1 room left
            </Text>
          </View>
        ) : null}

        {unavailable ? (
          <Text variant="labelSmall" style={{ color: travel.colors.soldOut }}>
            Room unavailable
          </Text>
        ) : null}

        <View style={[styles.row, { justifyContent: 'space-between', marginTop: 2 }]}>
          <Text variant="titleMedium">{formatMoney(room.price, { locale })}</Text>
          {room.paymentTiming ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {PAYMENT_LABEL[room.paymentTiming]}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, marginLeft: 4 },
  thumb: { width: 48, height: 48, marginHorizontal: 8 },
});
