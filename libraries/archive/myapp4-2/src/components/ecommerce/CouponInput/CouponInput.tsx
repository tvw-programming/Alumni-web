import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Divider, Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppTextInput } from '@ui/atoms/AppTextInput';
import { AppCard } from '@ui/molecules/AppCard';
import { formatMoney } from '@ui/primitives/money';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { CouponResult, CouponState, OfferListing } from '../types/domain';

/** Fallback copy. A specific server message always wins. */
const STATE_COPY: Record<CouponState, string> = {
  idle: '',
  validating: 'Checking your code…',
  applied: 'Coupon applied',
  invalid: 'That code is not valid',
  expired: 'That code has expired',
  ineligible: 'This code does not apply to your cart',
  error: 'We could not check that code. Try again.',
};

export interface CouponInputProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  result?: CouponResult;
  /** Server-authoritative validation. The component never decides eligibility. */
  onApply: (code: string) => void;
  onRemove?: () => void;
  offers?: OfferListing[];
  onCopyCode?: (code: string) => void;
  locale?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Coupon entry and discovery.
 *
 * Normalisation happens on input (trim, collapse whitespace, uppercase) because
 * pasted codes routinely carry a trailing space — and a "code not valid" error
 * caused by whitespace is an entirely self-inflicted support ticket.
 */
export const CouponInput = ({
  result,
  onApply,
  onRemove,
  offers = [],
  onCopyCode,
  locale = 'en-IN',
  placeholder = 'Enter a coupon code',
  disabled = false,
  animated = true,
  style,
  containerStyle,
  testID,
}: CouponInputProps) => {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const motion = useMotion({ animated });
  const [code, setCode] = useState('');
  const [showOffers, setShowOffers] = useState(false);

  const state = result?.state ?? 'idle';
  const applied = state === 'applied';
  const validating = state === 'validating';
  const failed = state === 'invalid' || state === 'expired' || state === 'ineligible' || state === 'error';

  const normalize = useCallback((input: string) => input.replace(/\s+/g, '').toUpperCase(), []);

  const message = useMemo(() => result?.message ?? STATE_COPY[state], [result?.message, state]);

  if (applied && result) {
    return (
      <Animated.View layout={motion.layout} style={containerStyle} testID={testID}>
        <AppCard
          variant="filled"
          style={[{ backgroundColor: shop.colors.savingsContainer }, style]}
          testID={childTestID(testID, 'applied')}
        >
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            <Icon source="tag-check-outline" size={20} color={shop.colors.savings} />
            <View style={styles.flex}>
              <Text variant="labelLarge" style={{ color: shop.colors.savings }}>
                {result.code} applied
              </Text>
              {result.discount ? (
                <Text variant="bodySmall" style={{ color: shop.colors.savings }}>
                  You save {formatMoney(result.discount, { locale })}
                  {/* Conditional discounts must not read as already-banked savings. */}
                  {result.conditional ? ' at checkout' : ''}
                </Text>
              ) : null}
              {message && result.message ? (
                <Text variant="labelSmall" style={{ color: shop.colors.savings }}>
                  {message}
                </Text>
              ) : null}
            </View>
            {onRemove ? (
              <AppButton
                variant="ghost"
                size="sm"
                onPress={onRemove}
                accessibilityLabel={`Remove coupon ${result.code}`}
                testID={childTestID(testID, 'remove')}
              >
                Remove
              </AppButton>
            ) : null}
          </View>
        </AppCard>
      </Animated.View>
    );
  }

  return (
    <View style={[{ gap: theme.spacing.sm }, containerStyle, style]} testID={testID}>
      <View style={[styles.row, { gap: theme.spacing.sm, alignItems: 'flex-start' }]}>
        <View style={styles.flex}>
          <AppTextInput
            label={placeholder}
            value={code}
            onChangeText={(text) => setCode(normalize(text))}
            autoCapitalize="characters"
            autoCorrect={false}
            clearable
            disabled={disabled || validating}
            error={failed}
            errorText={failed ? message : undefined}
            helperText={!failed && offers.length > 0 ? `${offers.length} offers available` : undefined}
            testID={childTestID(testID, 'input')}
          />
        </View>
        <AppButton
          variant="secondary"
          loading={validating}
          disabled={disabled || code.length === 0}
          debounceMs={600}
          onPress={() => onApply(code)}
          containerStyle={{ marginTop: 6 }}
          testID={childTestID(testID, 'apply')}
        >
          Apply
        </AppButton>
      </View>

      {result?.restrictions?.length ? (
        <View style={{ gap: 2 }}>
          {result.restrictions.map((restriction) => (
            <Text key={restriction} variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              • {restriction}
            </Text>
          ))}
        </View>
      ) : null}

      {offers.length > 0 ? (
        <>
          <TouchableRipple
            onPress={() => setShowOffers((prev) => !prev)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showOffers }}
            testID={childTestID(testID, 'toggle-offers')}
          >
            <View style={[styles.row, { paddingVertical: theme.spacing.xs }]}>
              <Text variant="labelLarge" style={[styles.flex, { color: theme.colors.primary }]}>
                {showOffers ? 'Hide offers' : 'View available offers'}
              </Text>
              <Icon source={showOffers ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.primary} />
            </View>
          </TouchableRipple>

          {showOffers ? (
            <Animated.View layout={motion.layout} style={{ gap: theme.spacing.sm }}>
              {offers.map((offer) => (
                <AppCard
                  key={offer.code}
                  variant="outlined"
                  style={offer.eligible ? undefined : { opacity: 0.7 }}
                  testID={childTestID(testID, `offer-${offer.code}`)}
                >
                  <View style={[styles.row, { gap: theme.spacing.sm }]}>
                    <View style={styles.flex}>
                      <View style={[styles.row, { gap: theme.spacing.xs }]}>
                        <Text variant="labelLarge">{offer.title}</Text>
                        {offer.autoApplied ? (
                          <Chip compact textStyle={{ fontSize: 10 }}>
                            Auto-applied
                          </Chip>
                        ) : null}
                      </View>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {offer.description}
                      </Text>
                      {/* Specific ineligibility copy, not a generic rejection. */}
                      {!offer.eligible && offer.ineligibleReason ? (
                        <Text variant="labelSmall" style={{ color: shop.colors.lowStock, marginTop: 2 }}>
                          {offer.ineligibleReason}
                        </Text>
                      ) : null}
                      {offer.expiresAt ? (
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Expires {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(offer.expiresAt))}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <TouchableRipple
                        onPress={() => onCopyCode?.(offer.code)}
                        accessibilityRole="button"
                        accessibilityLabel={`Copy code ${offer.code}`}
                        testID={childTestID(testID, `copy-${offer.code}`)}
                      >
                        <View
                          style={[
                            styles.codeChip,
                            { borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.sm, padding: 4 },
                          ]}
                        >
                          <Text variant="labelSmall">{offer.code}</Text>
                          <Icon source="content-copy" size={12} color={theme.colors.onSurfaceVariant} />
                        </View>
                      </TouchableRipple>

                      {offer.eligible && !offer.autoApplied ? (
                        <AppButton
                          variant="ghost"
                          size="sm"
                          onPress={() => onApply(offer.code)}
                          testID={childTestID(testID, `apply-${offer.code}`)}
                        >
                          Apply
                        </AppButton>
                      ) : null}
                    </View>
                  </View>
                </AppCard>
              ))}
              <Divider />
            </Animated.View>
          ) : null}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  codeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderStyle: 'dashed' },
  flex: { flex: 1 },
});
