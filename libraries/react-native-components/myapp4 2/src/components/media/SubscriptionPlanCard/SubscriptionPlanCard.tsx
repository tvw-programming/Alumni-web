import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, Icon, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useStreamingTheme } from '../theme/mediaTokens';
import type { SubscriptionPlan } from '../types/domain';

export interface SubscriptionPlanCardProps extends StyleEscapeHatches {
  plan: SubscriptionPlan;
  selected?: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
  onContinue: (plan: SubscriptionPlan) => void;
}

/**
 * Billing, tax, and trial-eligibility rules live in the subscription
 * service — this card only ever renders the plan metadata it's handed. A
 * trial is never called "free" without also stating when billing begins.
 */
export const SubscriptionPlanCard = ({ plan, selected = false, onSelect, onContinue, style, containerStyle, testID }: SubscriptionPlanCardProps) => {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const id = testID ?? `plan-${plan.id}`;
  const loading = plan.availability === 'loading';
  const unavailable = plan.availability === 'unavailable';

  return (
    <AppCard
      variant={selected || plan.recommended ? 'elevated' : 'outlined'}
      containerStyle={containerStyle}
      style={[selected ? { borderColor: theme.colors.primary, borderWidth: 2 } : undefined, style]}
      testID={id}
    >
      <View style={{ gap: theme.spacing.sm }} accessibilityRole="radio" accessibilityState={{ selected, disabled: unavailable }}>
        <View style={styles.row}>
          <Text variant="titleMedium" style={styles.flex}>
            {plan.name}
          </Text>
          {plan.current ? (
            <Chip compact mode="flat" style={{ backgroundColor: theme.colors.surfaceVariant }}>
              Current plan
            </Chip>
          ) : plan.recommended ? (
            <Chip compact mode="flat" style={{ backgroundColor: theme.colors.primaryContainer }} textStyle={{ color: theme.colors.onPrimaryContainer }}>
              Most popular
            </Chip>
          ) : plan.badge ? (
            <Chip compact mode="outlined">
              {plan.badge}
            </Chip>
          ) : null}
        </View>

        {loading ? (
          <ActivityIndicator size={20} accessibilityLabel="Loading plan pricing" />
        ) : (
          <View>
            <Text variant="headlineSmall">{plan.priceLabel}</Text>
            <Text variant="labelSmall" style={{ color: media.colors.onSurfaceVariant }}>
              {plan.billingLabel}
            </Text>
          </View>
        )}

        {plan.trialLabel ? (
          <View style={styles.row}>
            <Icon source="information-outline" size={13} color={media.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: media.colors.onSurfaceVariant, marginLeft: 4, flex: 1 }}>
              {plan.trialLabel}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 4, marginTop: 4 }}>
          {plan.features.map((feature) => (
            <View key={feature.id} style={styles.row}>
              <Icon
                source={feature.included ? 'check' : 'close'}
                size={15}
                color={feature.included ? media.colors.downloaded : media.colors.onSurfaceVariant}
              />
              <Text
                variant="bodySmall"
                style={{ color: feature.included ? theme.colors.onSurface : media.colors.onSurfaceVariant, marginLeft: 6, flex: 1 }}
              >
                {feature.label}
                {feature.detail ? ` — ${feature.detail}` : ''}
              </Text>
            </View>
          ))}
        </View>

        {unavailable ? (
          <Text variant="labelSmall" style={{ color: media.colors.error }}>
            Not available in your region.
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
          <AppButton variant="secondary" size="sm" containerStyle={styles.flex} onPress={() => onSelect(plan)} disabled={unavailable} testID={childTestID(id, 'select')}>
            {selected ? 'Selected' : 'Select'}
          </AppButton>
          <AppButton
            variant={plan.recommended ? 'primary' : 'secondary'}
            size="sm"
            containerStyle={styles.flex}
            disabled={unavailable || plan.current}
            onPress={() => onContinue(plan)}
            testID={childTestID(id, 'continue')}
          >
            {plan.current ? 'Current plan' : plan.trialLabel ? 'Start free trial' : 'Subscribe'}
          </AppButton>
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
