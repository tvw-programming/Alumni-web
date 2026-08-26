import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, HelperText, IconButton, Text, TouchableRipple } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { AppTextInput } from '@ui/atoms/AppTextInput';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useControllableState, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { Size, StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { QuantityConfig } from '../types/domain';

export type StepperVariant = 'inline' | 'cart' | 'product' | 'grocery' | 'readonly';

export interface QuantityStepperProps
  extends Omit<QuantityConfig, 'value'>,
    StyleEscapeHatches,
    Pick<AnimatableProps, 'animated'> {
  value?: number;
  defaultValue?: number;
  onChange?: (next: number) => void;
  /** Fires when the user tries to exceed a limit — surface a toast from here. */
  onLimitReached?: (reason: string) => void;
  /** Direct numeric entry, for large cart quantities. */
  allowDirectEntry?: boolean;
  variant?: StepperVariant;
  size?: Size;
  /** Label for the item, used in the accessible names. */
  itemLabel?: string;
  /** Removing at min quantity instead of blocking. */
  onRemove?: () => void;
}

const SIZE_MAP: Record<Size, { control: number; font: 'labelMedium' | 'bodyLarge' | 'titleMedium' }> = {
  sm: { control: 28, font: 'labelMedium' },
  md: { control: 36, font: 'bodyLarge' },
  lg: { control: 44, font: 'titleMedium' },
};

/**
 * Quantity control.
 *
 * It owns no inventory logic — `max` and `disabledReason` are server-confirmed
 * values passed in. What it does own is telling the user *why* they cannot go
 * higher, because a silently disabled "+" is the most common complaint about
 * this control.
 */
export const QuantityStepper = forwardRef<View, QuantityStepperProps>(function QuantityStepper(
  {
    value,
    defaultValue = 1,
    onChange,
    onLimitReached,
    min = 1,
    max,
    step = 1,
    unit,
    disabledReason,
    updateState = 'idle',
    allowDirectEntry = false,
    variant = 'inline',
    size = 'md',
    itemLabel = 'item',
    onRemove,
    animated = true,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const motion = useMotion({ animated });
  const [entryOpen, setEntryOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const [quantity, setQuantity] = useControllableState<number>({ value, defaultValue, onChange });

  const dims = SIZE_MAP[size];
  const busy = updateState === 'loading';
  const atMin = quantity <= min;
  const atMax = max != null && quantity >= max;

  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const bump = useCallback(
    (delta: number) => {
      const next = Math.round((quantity + delta) * 1000) / 1000;

      if (delta > 0 && max != null && next > max) {
        onLimitReached?.(disabledReason ?? `Only ${max} available`);
        return;
      }
      if (delta < 0 && next < min) {
        if (onRemove) onRemove();
        else onLimitReached?.(`Minimum quantity is ${min}`);
        return;
      }

      if (motion.enabled) {
        pop.value = withSequence(withSpring(1.12, theme.motion.spring.bouncy), withSpring(1, theme.motion.spring.snappy));
      }
      setQuantity(next);
    },
    [disabledReason, max, min, motion.enabled, onLimitReached, onRemove, pop, quantity, setQuantity, theme.motion.spring],
  );

  const commitDraft = useCallback(() => {
    const parsed = Number.parseFloat(draft.replace(/[^\d.]/g, ''));
    setEntryOpen(false);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.min(max ?? parsed, Math.max(min, parsed));
    if (clamped !== parsed) onLimitReached?.(disabledReason ?? `Adjusted to ${clamped}${unit ? ` ${unit}` : ''}`);
    setQuantity(clamped);
  }, [disabledReason, draft, max, min, onLimitReached, setQuantity, unit]);

  const display = useMemo(() => {
    // Fractional units ("0.5 kg") must not render as "0.5" with no context.
    const formatted = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/0$/, '');
    return unit ? `${formatted} ${unit}` : formatted;
  }, [quantity, unit]);

  if (variant === 'readonly') {
    return (
      <View ref={ref} style={containerStyle} testID={testID}>
        <Text variant={dims.font} accessibilityLabel={`Quantity ${display} of ${itemLabel}`}>
          {display}
        </Text>
      </View>
    );
  }

  const decreaseIcon = atMin && onRemove ? 'delete-outline' : 'minus';

  return (
    <View ref={ref} style={containerStyle} testID={testID}>
      <View
        style={[
          styles.row,
          {
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            borderRadius: theme.radii.pill,
            opacity: busy ? 0.7 : 1,
          },
          style,
        ]}
        accessibilityRole="adjustable"
        accessibilityValue={{ min, max, now: quantity, text: display }}
      >
        <IconButton
          icon={decreaseIcon}
          size={dims.control / 2}
          disabled={busy || (atMin && !onRemove)}
          onPress={() => bump(-step)}
          // Never an unlabelled minus icon.
          accessibilityLabel={
            atMin && onRemove ? `Remove ${itemLabel} from cart` : `Decrease quantity of ${itemLabel}`
          }
          // Compact visuals, generous hit area.
          hitSlop={8}
          style={{ margin: 0 }}
          testID={childTestID(testID, 'decrease')}
        />

        {busy ? (
          <View style={[styles.value, { minWidth: dims.control * 1.4 }]}>
            <ActivityIndicator size={14} testID={childTestID(testID, 'updating')} />
          </View>
        ) : (
          <TouchableRipple
            onPress={
              allowDirectEntry
                ? () => {
                    setDraft(String(quantity));
                    setEntryOpen(true);
                  }
                : undefined
            }
            disabled={!allowDirectEntry}
            accessibilityRole={allowDirectEntry ? 'button' : 'text'}
            accessibilityLabel={
              allowDirectEntry ? `Quantity ${display}. Tap to type an amount.` : `Quantity ${display}`
            }
            testID={childTestID(testID, 'value')}
          >
            <Animated.View style={[styles.value, popStyle, { minWidth: dims.control * 1.4 }]}>
              <Text variant={dims.font} style={styles.tabular}>
                {display}
              </Text>
            </Animated.View>
          </TouchableRipple>
        )}

        <IconButton
          icon="plus"
          size={dims.control / 2}
          disabled={busy || atMax}
          onPress={() => bump(step)}
          accessibilityLabel={`Increase quantity of ${itemLabel}`}
          accessibilityHint={atMax ? disabledReason ?? `Only ${max} available` : undefined}
          hitSlop={8}
          style={{ margin: 0 }}
          testID={childTestID(testID, 'increase')}
        />
      </View>

      {/* Explains the ceiling instead of leaving a dead "+". */}
      {(atMax || updateState === 'error') && (disabledReason || max != null) ? (
        <HelperText
          type={updateState === 'error' ? 'error' : 'info'}
          visible
          padding="none"
          style={{ color: updateState === 'error' ? shop.colors.priceDeal : shop.colors.lowStock }}
          testID={childTestID(testID, 'limit')}
        >
          {updateState === 'error' ? 'Could not update. Tap to retry.' : disabledReason ?? `Only ${max} available`}
        </HelperText>
      ) : null}

      {allowDirectEntry ? (
        <AppSheet
          visible={entryOpen}
          onDismiss={() => setEntryOpen(false)}
          variant="center"
          title={`Quantity of ${itemLabel}`}
          animated={animated}
          testID={childTestID(testID, 'entry-sheet')}
        >
          <AppTextInput
            label={unit ? `Quantity (${unit})` : 'Quantity'}
            value={draft}
            onChangeText={setDraft}
            keyboardType="decimal-pad"
            autoFocus
            helperText={max != null ? `Between ${min} and ${max}` : `Minimum ${min}`}
            onSubmitEditing={commitDraft}
            onBlur={commitDraft}
            testID={childTestID(testID, 'entry-input')}
          />
        </AppSheet>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  value: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 6 },
  tabular: { fontVariant: ['tabular-nums'] },
});
