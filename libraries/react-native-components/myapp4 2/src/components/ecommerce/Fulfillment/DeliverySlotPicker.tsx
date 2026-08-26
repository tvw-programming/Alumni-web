import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper';

import { SegmentedTabs } from '@ui/molecules/SegmentedTabs';
import { StateView } from '@ui/molecules/StateView';
import { formatMoney } from '@ui/primitives/money';
import { useControllableState, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { DeliverySlot } from '../types/domain';

export interface DeliverySlotPickerProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  slots: DeliverySlot[];
  value?: string;
  defaultValue?: string;
  onChange?: (slot: DeliverySlot) => void;
  locale?: string;
  loading?: boolean;
  /** Minimum basket not met, cutoff passed, etc. */
  blockedReason?: string;
  onRefresh?: () => void;
}

const groupByDay = (slots: DeliverySlot[], locale: string) => {
  const groups = new Map<string, { key: string; label: string; slots: DeliverySlot[] }>();
  for (const slot of slots) {
    const date = new Date(slot.date);
    const today = new Date();
    const diff = Math.round(
      (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
        new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
        86_400_000,
    );
    const label =
      diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(date);

    const existing = groups.get(label);
    if (existing) existing.slots.push(slot);
    else groups.set(label, { key: label, label, slots: [slot] });
  }
  return [...groups.values()];
};

/**
 * Delivery slot selection.
 *
 * Earliest-available leads, fees are shown on the slot itself rather than
 * revealed at payment, and a full slot stays visible with a reason instead of
 * silently disappearing — users need to see that 8am went, not wonder why the
 * list looks different.
 */
export const DeliverySlotPicker = ({
  slots,
  value,
  defaultValue,
  onChange,
  locale = 'en-IN',
  loading = false,
  blockedReason,
  onRefresh,
  style,
  containerStyle,
  testID,
}: DeliverySlotPickerProps) => {
  const theme = useAppTheme();
  const shop = useShopTheme();

  const [selectedId, setSelectedId] = useControllableState<string>({
    value,
    defaultValue: defaultValue ?? slots.find((slot) => slot.availability === 'available')?.id ?? '',
    onChange: undefined,
  });

  const instant = useMemo(() => slots.filter((slot) => slot.type === 'instant'), [slots]);
  const scheduled = useMemo(() => slots.filter((slot) => slot.type !== 'instant'), [slots]);
  const days = useMemo(() => groupByDay(scheduled, locale), [locale, scheduled]);

  const [tab, setTab] = React.useState(instant.length > 0 ? 'instant' : 'scheduled');

  const select = useCallback(
    (slot: DeliverySlot) => {
      if (slot.availability !== 'available') return;
      setSelectedId(slot.id);
      onChange?.(slot);
    },
    [onChange, setSelectedId],
  );

  if (loading) {
    return (
      <View style={[styles.center, { padding: theme.spacing.xl }, containerStyle]} testID={childTestID(testID, 'loading')}>
        <ActivityIndicator />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm }}>
          Finding delivery slots…
        </Text>
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <StateView
        preset="empty"
        title="No delivery slots available"
        description="All slots for this address are full. Try again shortly or pick a different address."
        primaryAction={onRefresh ? { label: 'Refresh slots', onPress: onRefresh } : undefined}
        containerStyle={containerStyle}
        testID={childTestID(testID, 'empty')}
      />
    );
  }

  const renderSlot = (slot: DeliverySlot) => {
    const selected = slot.id === selectedId;
    const unavailable = slot.availability !== 'available';
    const feeLabel = slot.fee && slot.fee.minorUnits > 0 ? formatMoney(slot.fee, { locale }) : 'Free';

    return (
      <TouchableRipple
        key={slot.id}
        onPress={() => select(slot)}
        disabled={unavailable}
        accessibilityRole="radio"
        accessibilityState={{ selected, disabled: unavailable }}
        accessibilityLabel={`${slot.label ?? `${slot.startTime} to ${slot.endTime}`}, ${feeLabel}${
          unavailable ? `, ${slot.availability === 'full' ? 'full' : 'no longer available'}` : ''
        }${slot.recommended ? ', recommended' : ''}`}
        style={[
          styles.slot,
          {
            borderColor: selected ? shop.colors.swatchSelected : theme.colors.outlineVariant,
            borderWidth: selected ? 2 : 1,
            borderRadius: theme.radii.md,
            padding: theme.spacing.md,
            opacity: unavailable ? 0.55 : 1,
            backgroundColor: theme.colors.surface,
          },
        ]}
        testID={childTestID(testID, `slot-${slot.id}`)}
      >
        <View style={styles.row}>
          <View style={styles.flex}>
            <View style={[styles.row, { gap: theme.spacing.xs }]}>
              <Text variant="bodyLarge">{slot.label ?? `${slot.startTime} – ${slot.endTime}`}</Text>
              {slot.recommended ? (
                <View style={{ backgroundColor: shop.colors.savingsContainer, borderRadius: theme.radii.sm, paddingHorizontal: 6 }}>
                  <Text variant="labelSmall" style={{ color: shop.colors.savings }}>
                    Fastest
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Fee is on the slot, not deferred to the payment step. */}
            <Text
              variant="labelSmall"
              style={{ color: slot.fee && slot.fee.minorUnits > 0 ? theme.colors.onSurfaceVariant : shop.colors.savings }}
            >
              {feeLabel}
            </Text>

            {unavailable ? (
              <Text variant="labelSmall" style={{ color: shop.colors.lowStock }}>
                {slot.availability === 'full' ? 'This slot is full' : 'No longer available'}
              </Text>
            ) : null}
          </View>

          {selected ? <Icon source="check-circle" size={20} color={shop.colors.swatchSelected} /> : null}
        </View>
      </TouchableRipple>
    );
  };

  return (
    <View style={[{ gap: theme.spacing.md }, containerStyle, style]} testID={testID}>
      {blockedReason ? (
        <View style={[styles.row, { gap: 6, backgroundColor: shop.colors.surfacePromo, borderRadius: theme.radii.md, padding: theme.spacing.sm }]}>
          <Icon source="information-outline" size={16} color={shop.colors.onSurfacePromo} />
          <Text variant="labelSmall" style={{ color: shop.colors.onSurfacePromo, flex: 1 }}>
            {blockedReason}
          </Text>
        </View>
      ) : null}

      {instant.length > 0 && scheduled.length > 0 ? (
        <SegmentedTabs
          items={[
            { key: 'instant', label: 'Now' },
            { key: 'scheduled', label: 'Schedule' },
          ]}
          value={tab}
          onChange={setTab}
          testID={childTestID(testID, 'tabs')}
        />
      ) : null}

      <View accessibilityRole="radiogroup" accessibilityLabel="Choose a delivery slot" style={{ gap: theme.spacing.sm }}>
        {tab === 'instant' && instant.length > 0
          ? instant.map(renderSlot)
          : days.map((day) => (
              <View key={day.key} style={{ gap: theme.spacing.sm }}>
                <Text variant="labelLarge" accessibilityRole="header">
                  {day.label}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>
                  {day.slots.map((slot) => (
                    <View key={slot.id} style={{ width: 200 }}>
                      {renderSlot(slot)}
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  slot: {},
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
});
