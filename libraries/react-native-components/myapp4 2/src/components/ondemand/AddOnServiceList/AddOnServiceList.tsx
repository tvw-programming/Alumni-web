import React, { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Checkbox, Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppSheet } from '@ui/organisms/AppSheet';
import { formatMoney, type Money } from '@ui/primitives/money';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useServiceTheme } from '../theme/ondemandTokens';
import type { AddOn } from '../types/domain';

export interface AddOnServiceListProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  addOns: AddOn[];
  locale?: string;
  onToggle: (addOn: AddOn, selected: boolean) => void;
  onQuantityChange?: (addOn: AddOn, quantity: number) => void;
}

/**
 * Optional and required extras attached to a service.
 *
 * The whole row is the checkbox target — description text never creates a dead
 * zone between the label and the control. Unavailable add-ons stay listed with
 * a stated reason (never a strikethrough alone), and totals are the caller's
 * job; this list only emits selection intent.
 */
export const AddOnServiceList = memo(function AddOnServiceList({
  addOns,
  locale = 'en-IN',
  onToggle,
  onQuantityChange,
  animated = true,
  style,
  containerStyle,
  testID,
}: AddOnServiceListProps) {
  const theme = useAppTheme();
  const service = useServiceTheme();
  const motion = useMotion({ animated });
  const id = testID ?? 'addons';

  const rowLabel = useCallback(
    (addOn: AddOn) =>
      [
        addOn.label,
        addOn.required ? 'included' : addOn.selected ? 'selected' : 'optional',
        `adds ${formatMoney(addOn.price, { locale })}${addOn.unitLabel ? ` ${addOn.unitLabel}` : ''}`,
        addOn.recommended ? 'recommended' : undefined,
        addOn.disabled ? addOn.disabledReason ?? 'not available' : undefined,
      ]
        .filter(Boolean)
        .join(', '),
    [locale],
  );

  return (
    <Animated.View style={[{ gap: 2 }, containerStyle, style]} layout={motion.layout} testID={id}>
      {addOns.map((addOn) => {
        const locked = addOn.required || addOn.disabled;
        return (
          <TouchableRipple
            key={addOn.id}
            onPress={locked ? undefined : () => onToggle(addOn, !addOn.selected)}
            disabled={locked}
            style={[
              styles.row,
              {
                borderRadius: theme.radii.md,
                paddingVertical: theme.spacing.sm,
                opacity: addOn.disabled ? 0.55 : 1,
              },
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: addOn.selected || addOn.required, disabled: locked }}
            accessibilityLabel={rowLabel(addOn)}
            testID={childTestID(id, `item-${addOn.id}`)}
          >
            <View style={[styles.rowInner, { gap: theme.spacing.sm }]}>
              {addOn.required ? (
                <Icon source="check-circle" size={22} color={service.colors.availableNow} />
              ) : (
                <Checkbox
                  status={addOn.selected ? 'checked' : 'unchecked'}
                  disabled={addOn.disabled}
                  onPress={() => onToggle(addOn, !addOn.selected)}
                />
              )}

              <View style={styles.flex}>
                <View style={[styles.rowInner, { gap: 4 }]}>
                  <Text variant="bodyMedium" style={styles.shrink}>
                    {addOn.label}
                  </Text>
                  {addOn.recommended ? (
                    <View style={[styles.badge, { backgroundColor: service.colors.surfaceSelected, borderRadius: theme.radii.sm }]}>
                      <Text variant="labelSmall" style={{ color: service.colors.onSurfaceSelected }}>
                        Recommended
                      </Text>
                    </View>
                  ) : null}
                </View>

                {addOn.description ? (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {addOn.description}
                  </Text>
                ) : null}

                {addOn.disabled && addOn.disabledReason ? (
                  <Text variant="labelSmall" style={{ color: service.colors.statusDelayed }}>
                    {addOn.disabledReason}
                  </Text>
                ) : null}

                {!addOn.disabled && addOn.selected && addOn.maxQuantity && addOn.maxQuantity > 1 && onQuantityChange ? (
                  <View style={[styles.rowInner, { gap: theme.spacing.sm, marginTop: 4 }]}>
                    <QtyButton
                      icon="minus"
                      label={`Decrease ${addOn.label}`}
                      disabled={(addOn.quantity ?? 1) <= 1}
                      onPress={() => onQuantityChange(addOn, Math.max(1, (addOn.quantity ?? 1) - 1))}
                    />
                    <Text variant="labelMedium" style={styles.tabular}>
                      {addOn.quantity ?? 1}
                    </Text>
                    <QtyButton
                      icon="plus"
                      label={`Increase ${addOn.label}`}
                      disabled={(addOn.quantity ?? 1) >= addOn.maxQuantity}
                      onPress={() => onQuantityChange(addOn, Math.min(addOn.maxQuantity!, (addOn.quantity ?? 1) + 1))}
                    />
                  </View>
                ) : null}
              </View>

              <Text
                variant="labelMedium"
                style={[
                  styles.tabular,
                  { color: addOn.required ? service.colors.availableNow : theme.colors.onSurfaceVariant },
                ]}
              >
                {addOn.required ? 'Included' : `+${formatMoney(addOn.price, { locale })}`}
                {addOn.unitLabel && !addOn.required ? ` ${addOn.unitLabel}` : ''}
              </Text>
            </View>
          </TouchableRipple>
        );
      })}
    </Animated.View>
  );
});

const QtyButton = ({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) => {
  const theme = useAppTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={disabled}
      borderless
      style={{ padding: 4, borderRadius: 14, opacity: disabled ? 0.4 : 1 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon source={icon} size={16} color={theme.colors.onSurfaceVariant} />
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { width: '100%' },
  rowInner: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 5, paddingVertical: 1 },
  shrink: { flexShrink: 1 },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
