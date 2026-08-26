/**
 * USAGE — CouponInput
 *
 * Validation lives in the caller (standing in for the server). Note the
 * re-validation when the cart changes: a coupon that was valid a minute ago may
 * not be now, and silently keeping it applied would misstate the total.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { CouponResult, OfferListing } from '../types/domain';
import { CouponInput } from './CouponInput';
import sample from './CouponInput.sample.json';

const data = loadSample<{ offers: OfferListing[]; results: Record<string, CouponResult> }>(sample);

export const CouponInputUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [result, setResult] = useState<CouponResult | undefined>();

  /** Stands in for the server. Try SAVE200, BANK10, SUMMER20, FASHION25. */
  const validate = useCallback(
    async (code: string) => {
      setResult({ code, state: 'validating' });
      await new Promise((resolve) => setTimeout(resolve, 700));

      if (code === 'SAVE200') setResult(data.results.applied);
      else if (code === 'BANK10') setResult(data.results.conditional);
      else if (code === 'SUMMER20') setResult(data.results.expired);
      else if (code === 'FASHION25') setResult(data.results.ineligible);
      else setResult({ ...data.results.invalid!, code });
    },
    [],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Try SAVE200 (applies), BANK10 (conditional), SUMMER20 (expired), FASHION25 (ineligible), or anything else.
        Whitespace and lowercase are normalised on input.
      </Text>

      <CouponInput
        result={result}
        offers={data.offers}
        onApply={(code) => void validate(code)}
        onRemove={() => {
          setResult(undefined);
          toast.show('Coupon removed');
        }}
        onCopyCode={(code) => toast.success(`${code} copied`)}
        testID="coupon"
      />

      <AppButton
        variant="ghost"
        onPress={() => {
          // Cart changed → re-validate rather than assuming the coupon still holds.
          if (result?.state === 'applied') {
            setResult({
              code: result.code,
              state: 'ineligible',
              message: 'Removed — your cart no longer meets the minimum order',
            });
            toast.warning('Coupon removed because your cart changed');
          }
        }}
      >
        Simulate a cart change that invalidates the coupon
      </AppButton>

      <View style={{ gap: theme.spacing.md }}>
        <Text variant="labelLarge">Every result state</Text>
        {Object.entries(data.results).map(([key, value]) => (
          <View key={key} style={{ gap: 4 }}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {key}
            </Text>
            <CouponInput result={value} onApply={() => {}} onRemove={() => {}} testID={`coupon-${key}`} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
