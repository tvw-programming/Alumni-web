import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { useForm } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';

import {
  AppButton,
  AppCard,
  AppTextInput,
  CurrencyInput,
  FormField,
  FormWrapper,
  OTPInput,
  PhoneInput,
  StateView,
  StepperIndicator,
  useToast,
} from '@ui';
import { useAppTheme } from '@/theme';
import { api } from '@/services/api';
import { selectCartTotalMinor, useCartStore } from '@/store';
import { formatMinorUnits } from '@/utils';

interface CheckoutValues {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  tipMinor: number;
  otp: string;
}

const STEPS = [
  { key: 'contact', label: 'Contact' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'verify', label: 'Verify' },
];

const STEP_FIELDS: Array<Array<keyof CheckoutValues>> = [
  ['fullName', 'email', 'phone'],
  ['address', 'tipMinor'],
  ['otp'],
];

/**
 * Hand-written on purpose. Checkout is regulated, heavily tested, and changes
 * with releases — exactly the surface where server-driven UI is a liability.
 */
export const CheckoutScreen = () => {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const toast = useToast();

  const lines = useCartStore((state) => state.lines);
  const totalMinor = useCartStore(selectCartTotalMinor);
  const clearCart = useCartStore((state) => state.clear);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CheckoutValues>({
    mode: 'onBlur',
    defaultValues: { fullName: '', email: '', phone: '', address: '', tipMinor: 0, otp: '' },
  });

  const tipMinor = form.watch('tipMinor');
  const grandTotal = totalMinor + (tipMinor || 0);

  const goNext = useCallback(async () => {
    const fields = STEP_FIELDS[step] ?? [];
    const valid = await form.trigger(fields as never);
    if (valid) setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }, [form, step]);

  const handleSubmit = useCallback(
    async (values: CheckoutValues) => {
      setSubmitting(true);
      try {
        const { reference } = await api.submitCheckout(values as unknown as Record<string, unknown>);
        clearCart();
        toast.success(`Order ${reference} placed`);
        navigation.goBack();
      } catch (error) {
        form.setError('otp', { message: error instanceof Error ? error.message : 'Payment failed' });
        toast.error('We could not place your order');
      } finally {
        setSubmitting(false);
      }
    },
    [clearCart, form, navigation, toast],
  );

  const summary = useMemo(
    () => (
      <AppCard variant="filled" title="Order summary" entering="fade" containerStyle={{ marginBottom: theme.spacing.md }}>
        {lines.map((line) => (
          <View key={line.productId} style={styles.row}>
            <Text variant="bodyMedium" style={styles.flex} numberOfLines={1}>
              {line.name} × {line.quantity}
            </Text>
            <Text variant="bodyMedium">{formatMinorUnits(line.priceMinor * line.quantity, 'INR', 'en-IN')}</Text>
          </View>
        ))}
        <Divider style={{ marginVertical: theme.spacing.sm }} />
        <View style={styles.row}>
          <Text variant="titleMedium" style={styles.flex}>
            Total
          </Text>
          <Text variant="titleMedium">{formatMinorUnits(grandTotal, 'INR', 'en-IN')}</Text>
        </View>
      </AppCard>
    ),
    [grandTotal, lines, theme.spacing.md, theme.spacing.sm],
  );

  if (lines.length === 0) {
    return (
      <StateView
        preset="empty"
        title="Your cart is empty"
        description="Add something from the catalog and it will show up here."
        primaryAction={{ label: 'Browse catalog', onPress: () => navigation.goBack() }}
        testID="checkout-empty"
      />
    );
  }

  return (
    <FormWrapper<CheckoutValues>
      form={form}
      onSubmit={handleSubmit}
      showErrorOn="blur"
      testID="checkout-form"
      footer={(submit) =>
        step < STEPS.length - 1 ? (
          <AppButton variant="primary" fullWidth size="lg" onPress={() => void goNext()} testID="checkout-next">
            Continue
          </AppButton>
        ) : (
          <AppButton
            variant="primary"
            fullWidth
            size="lg"
            loading={submitting}
            debounceMs={1200}
            onPress={submit}
            testID="checkout-pay"
          >
            {`Pay ${formatMinorUnits(grandTotal, 'INR', 'en-IN')}`}
          </AppButton>
        )
      }
    >
      <StepperIndicator
        steps={STEPS}
        current={step}
        variant="numbered"
        allowBack
        onStepPress={setStep}
        containerStyle={{ marginBottom: theme.spacing.lg }}
        testID="checkout-stepper"
      />

      {summary}

      {step === 0 && (
        <>
          <FormField
            name="fullName"
            as={AppTextInput}
            rules={{ required: 'Enter your name' }}
            label="Full name"
            autoComplete="name"
            clearable
          />
          <FormField
            name="email"
            as={AppTextInput}
            rules={{
              required: 'Enter your email',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, message: 'Enter a valid email' },
            }}
            label="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <FormField
            name="phone"
            as={PhoneInput}
            rules={{ required: 'Enter your phone number', minLength: { value: 10, message: 'Enter 10 digits' } }}
            defaultCountry="IN"
          />
        </>
      )}

      {step === 1 && (
        <>
          <FormField
            name="address"
            as={AppTextInput}
            rules={{ required: 'Enter a delivery address', minLength: { value: 10, message: 'Add a little more detail' } }}
            label="Delivery address"
            multiline
            numberOfLines={3}
            showCounter
            maxLength={160}
          />
          <FormField
            name="tipMinor"
            as={CurrencyInput}
            label="Add a tip (optional)"
            currency="INR"
            locale="en-IN"
            helperText="Goes directly to your delivery partner."
          />
        </>
      )}

      {step === 2 && (
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            We sent a 6-digit code to your phone. Use 123456 for this demo.
          </Text>
          <FormField
            name="otp"
            as={OTPInput}
            rules={{ required: 'Enter the code', minLength: { value: 6, message: 'Enter all 6 digits' } }}
            length={6}
            autoFocus
            resendIn={30}
            onResend={() => toast.show('Code sent again')}
          />
        </View>
      )}
    </FormWrapper>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
