import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Chip, Divider, Icon, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';
import type { PurchaseBundle, PurchaseFlowStatus } from '../types/domain';

export interface InAppPurchaseCardProps extends StyleEscapeHatches {
  bundle: PurchaseBundle;
  purchaseStatus?: PurchaseFlowStatus;
  taxDisclosure?: string;
  onPurchase: (bundle: PurchaseBundle) => void;
  onRestore?: () => void;
}

/**
 * The card never grants an entitlement itself — a `pending` status stays
 * pending, visibly, until the host screen tells it `success` after
 * server-side receipt validation. "Value" (savings, original price) is
 * supplied by the commerce service, never computed here.
 */
export const InAppPurchaseCard = ({ bundle, purchaseStatus = 'idle', taxDisclosure, onPurchase, onRestore, style, containerStyle, testID }: InAppPurchaseCardProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? `iap-${bundle.id}`;
  const [confirming, setConfirming] = useState(false);

  const owned = bundle.availability === 'owned';
  const unavailable = bundle.availability === 'unavailable';
  const loadingStore = bundle.availability === 'loading';
  const pending = purchaseStatus === 'pending';

  const handleConfirm = () => {
    setConfirming(false);
    onPurchase(bundle);
  };

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.flex}>
            {bundle.title}
          </Text>
          {bundle.limitedTime ? (
            <Chip compact mode="flat" style={{ backgroundColor: gaming.colors.surfaceSelected }} textStyle={{ color: gaming.colors.onSurfaceSelected }}>
              Limited time
            </Chip>
          ) : null}
        </View>

        <View style={{ gap: 4 }}>
          {bundle.items.map((item) => (
            <View key={item.id} style={styles.row}>
              {item.icon?.uri ? (
                <Image source={{ uri: item.icon.uri }} style={styles.itemIcon} resizeMode="contain" accessibilityElementsHidden />
              ) : (
                <Icon source="gift-outline" size={16} color={theme.colors.onSurfaceVariant} />
              )}
              <Text variant="bodySmall" style={{ marginLeft: 6 }}>
                {item.quantity}× {item.label}
              </Text>
            </View>
          ))}
        </View>

        <Divider />

        <View style={styles.row}>
          <View style={styles.flex}>
            {bundle.originalValueLabel ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textDecorationLine: 'line-through' }}>
                {bundle.originalValueLabel}
              </Text>
            ) : null}
            <Text variant="titleMedium">{loadingStore ? '—' : bundle.priceLabel}</Text>
            {bundle.savingsLabel ? (
              <Text variant="labelSmall" style={{ color: gaming.colors.success }}>
                {bundle.savingsLabel}
              </Text>
            ) : null}
          </View>

          {loadingStore ? (
            <ActivityIndicator size={20} accessibilityLabel="Loading store data" />
          ) : owned ? (
            <Chip compact mode="flat" icon="check">
              Already owned
            </Chip>
          ) : (
            <AppButton
              variant="primary"
              size="md"
              disabled={unavailable}
              loading={pending}
              onPress={() => setConfirming(true)}
              testID={childTestID(id, 'purchase')}
            >
              {unavailable ? 'Unavailable' : 'Purchase'}
            </AppButton>
          )}
        </View>

        {taxDisclosure ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {taxDisclosure}
          </Text>
        ) : null}

        {purchaseStatus === 'failed' ? (
          <Text variant="labelSmall" style={{ color: gaming.colors.statusError }}>
            Purchase failed. You have not been charged.
          </Text>
        ) : null}

        {onRestore ? (
          <Text variant="labelSmall" onPress={onRestore} accessibilityRole="button" style={{ color: theme.colors.primary }} testID={childTestID(id, 'restore')}>
            Restore purchases
          </Text>
        ) : null}
      </View>

      <AppSheet visible={confirming} onDismiss={() => setConfirming(false)} variant="center" scrollable={false} testID={childTestID(id, 'confirm-sheet')}>
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
          <Text variant="titleMedium">Confirm purchase</Text>
          <Text variant="bodyMedium">
            {bundle.title} — {bundle.priceLabel}
          </Text>
          {taxDisclosure ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {taxDisclosure}
            </Text>
          ) : null}
          <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
            <AppButton variant="primary" size="lg" fullWidth onPress={handleConfirm} testID={childTestID(id, 'confirm-purchase')}>
              Buy for {bundle.priceLabel}
            </AppButton>
            <AppButton variant="ghost" size="md" fullWidth onPress={() => setConfirming(false)}>
              Cancel
            </AppButton>
          </View>
        </View>
      </AppSheet>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  itemIcon: { width: 16, height: 16 },
});
