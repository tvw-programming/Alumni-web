import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, RadioButton, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { StatusBadge } from '@ui/atoms/StatusBadge';
import { useControllableState, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useFintechTheme } from '../theme/fintechTokens';
import { formatMoney } from '../types/money';
import type { CardNetwork, PaymentMethod } from '../types/domain';

const TYPE_ICON: Record<PaymentMethod['type'], string> = {
  bank: 'bank',
  card: 'credit-card-outline',
  wallet: 'wallet-outline',
  balance: 'cash',
  cash: 'cash-multiple',
};

const NETWORK_LABEL: Record<CardNetwork, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  rupay: 'RuPay',
  discover: 'Discover',
  unknown: 'Card',
};

export type SelectorPresentation = 'card' | 'list';

export interface PaymentMethodSelectorProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering'> {
  methods: PaymentMethod[];
  /** Controlled selection — ids. */
  selected?: string[];
  defaultSelected?: string[];
  onChange?: (selected: string[]) => void;
  /** Radio-group behaviour is the default; multi-select is opt-in. */
  mode?: 'singleSelect' | 'multiSelect';
  presentation?: SelectorPresentation;
  locale?: string;
  loading?: boolean;
  onAddMethod?: () => void;
  addMethodLabel?: string;
  /** Shown under the list — total/fee recap recalculated by the caller. */
  footer?: React.ReactNode;
}

/**
 * Funding-source picker.
 *
 * Business rules stay outside: this component does not decide whether a method
 * has sufficient funds or is currency-compatible. The caller computes
 * `availability` and `disabledReason`, and the component renders them. That is
 * what stops a selector from quietly becoming a rules engine.
 */
export const PaymentMethodSelector = forwardRef<View, PaymentMethodSelectorProps>(
  function PaymentMethodSelector(
    {
      methods,
      selected,
      defaultSelected = [],
      onChange,
      mode = 'singleSelect',
      presentation = 'card',
      locale = 'en-IN',
      loading = false,
      onAddMethod,
      addMethodLabel = 'Add payment method',
      footer,
      animated = true,
      entering = 'slideUp',
      style,
      containerStyle,
      testID,
    },
    ref,
  ) {
    const theme = useAppTheme();
    const fintech = useFintechTheme();
    const motion = useMotion({ animated });

    const [value, setValue] = useControllableState<string[]>({
      value: selected,
      defaultValue: defaultSelected,
      onChange,
    });

    const toggle = useCallback(
      (method: PaymentMethod) => {
        if (method.availability === 'unavailable') return;
        setValue((prev) => {
          if (mode === 'singleSelect') return [method.id];
          return prev.includes(method.id) ? prev.filter((id) => id !== method.id) : [...prev, method.id];
        });
      },
      [mode, setValue],
    );

    const rows = useMemo(
      () =>
        methods.map((method, index) => {
          const isSelected = value.includes(method.id);
          const disabled = method.availability === 'unavailable';
          const isLoading = method.availability === 'loading';

          // Never colour-only: selected state carries a radio, a border, and text.
          const borderColor = isSelected ? fintech.colors.borderSelected : theme.colors.outlineVariant;

          const detail = [
            method.maskedDetail,
            method.currency,
            method.deliveryEstimate,
            method.fee ? `Fee ${formatMoney(method.fee, { locale })}` : undefined,
          ]
            .filter(Boolean)
            .join(' · ');

          return (
            <Animated.View
              key={method.id}
              entering={motion.entering(entering, index)}
              layout={motion.layout}
              style={[
                presentation === 'card' && styles.cardWrap,
                presentation === 'card' && {
                  borderColor,
                  borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth * 2,
                  borderRadius: theme.radii.lg,
                  backgroundColor: theme.colors.surface,
                  opacity: disabled ? theme.opacity.disabled : 1,
                },
              ]}
            >
              <TouchableRipple
                onPress={() => toggle(method)}
                disabled={disabled || isLoading}
                accessibilityRole={mode === 'singleSelect' ? 'radio' : 'checkbox'}
                accessibilityState={{ selected: isSelected, disabled: disabled || isLoading }}
                accessibilityLabel={`${method.label}${detail ? `, ${detail}` : ''}${
                  disabled && method.disabledReason ? `, unavailable: ${method.disabledReason}` : ''
                }`}
                borderless={presentation === 'card'}
                testID={childTestID(testID, `method-${method.id}`)}
              >
                <View style={[styles.row, { padding: theme.spacing.md, gap: theme.spacing.md }]}>
                  <Icon
                    source={TYPE_ICON[method.type]}
                    size={theme.sizing.icon.lg}
                    color={disabled ? theme.colors.outline : theme.colors.onSurface}
                  />

                  <View style={styles.flex}>
                    <View style={styles.labelRow}>
                      <Text variant="bodyLarge" numberOfLines={1} style={styles.flex}>
                        {method.label}
                      </Text>
                      {method.badges?.map((badge) => (
                        <StatusBadge
                          key={badge}
                          status={badge === 'Recommended' ? 'recommended' : 'default_badge'}
                          label={badge}
                          size="sm"
                          containerStyle={{ marginLeft: theme.spacing.xs }}
                        />
                      ))}
                    </View>

                    {detail ? (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                        {detail}
                      </Text>
                    ) : null}

                    {/* Disabled methods must say WHY. */}
                    {disabled && method.disabledReason ? (
                      <Text variant="labelSmall" style={{ color: fintech.colors.statusError }}>
                        {method.disabledReason}
                      </Text>
                    ) : null}

                    {method.network ? (
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {NETWORK_LABEL[method.network]}
                      </Text>
                    ) : null}
                  </View>

                  {isLoading ? (
                    <ActivityIndicator size="small" testID={childTestID(testID, `method-${method.id}-loading`)} />
                  ) : mode === 'singleSelect' ? (
                    <RadioButton
                      value={method.id}
                      status={isSelected ? 'checked' : 'unchecked'}
                      onPress={() => toggle(method)}
                      disabled={disabled}
                    />
                  ) : (
                    <Icon
                      source={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={theme.sizing.icon.md}
                      color={isSelected ? fintech.colors.borderSelected : theme.colors.outline}
                    />
                  )}
                </View>
              </TouchableRipple>
            </Animated.View>
          );
        }),
      [entering, fintech, locale, methods, mode, motion, presentation, testID, theme, toggle, value],
    );

    if (loading) {
      return (
        <View style={[{ padding: theme.spacing.lg }, containerStyle]} testID={childTestID(testID, 'loading')}>
          <ActivityIndicator />
        </View>
      );
    }

    return (
      <View
        ref={ref}
        style={[{ gap: theme.spacing.sm }, containerStyle, style]}
        accessibilityRole={mode === 'singleSelect' ? 'radiogroup' : 'list'}
        testID={testID}
      >
        {rows}

        {onAddMethod ? (
          <TouchableRipple
            onPress={onAddMethod}
            accessibilityRole="button"
            accessibilityLabel={addMethodLabel}
            testID={childTestID(testID, 'add')}
          >
            <View style={[styles.row, { padding: theme.spacing.md, gap: theme.spacing.md }]}>
              <Icon source="plus-circle-outline" size={theme.sizing.icon.lg} color={theme.colors.primary} />
              <Text variant="bodyLarge" style={{ color: theme.colors.primary }}>
                {addMethodLabel}
              </Text>
            </View>
          </TouchableRipple>
        ) : null}

        {footer}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  cardWrap: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
