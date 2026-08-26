import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { Shipment, ShipmentStatus } from '../types/domain';

export interface ShipmentCardProps extends StyleEscapeHatches {
  shipment: Shipment;
  onPress: (shipment: Shipment) => void;
  onContactSupport?: (shipment: Shipment) => void;
}

const STATUS_META: Record<ShipmentStatus, { label: string; icon: string; colorKey: 'shipmentPending' | 'shipmentInTransit' | 'shipmentOutForDelivery' | 'shipmentDelivered' | 'shipmentException' }> = {
  pending: { label: 'Pending', icon: 'clock-outline', colorKey: 'shipmentPending' },
  readyToShip: { label: 'Ready to ship', icon: 'package-variant-closed', colorKey: 'shipmentPending' },
  readyForPickup: { label: 'Ready for pickup', icon: 'package-up', colorKey: 'shipmentPending' },
  inTransit: { label: 'In transit', icon: 'truck-fast-outline', colorKey: 'shipmentInTransit' },
  outForDelivery: { label: 'Out for delivery', icon: 'truck-delivery-outline', colorKey: 'shipmentOutForDelivery' },
  delivered: { label: 'Delivered', icon: 'check-circle', colorKey: 'shipmentDelivered' },
  rto: { label: 'Returned to origin', icon: 'undo-variant', colorKey: 'shipmentException' },
  lost: { label: 'Lost', icon: 'alert-circle', colorKey: 'shipmentException' },
  cancelled: { label: 'Cancelled', icon: 'close-circle-outline', colorKey: 'shipmentException' },
};

/**
 * Carrier status names vary; every carrier value must map to one of the
 * semantic states above before reaching this component — it never renders
 * a raw carrier string. `lastUpdatedAt` is always shown so "last scanned"
 * is never confused with "right now."
 */
export const ShipmentCard = ({ shipment, onPress, onContactSupport, style, containerStyle, testID }: ShipmentCardProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? `shipment-${shipment.id}`;
  const meta = STATUS_META[shipment.status];
  const isException = shipment.status === 'rto' || shipment.status === 'lost' || shipment.status === 'cancelled' || !!shipment.exception;

  return (
    <AppCard variant="outlined" onPress={() => onPress(shipment)} containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: 6 }}>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.flex}>
            AWB {shipment.consignmentId}
          </Text>
          {shipment.carrier ? (
            <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
              {shipment.carrier}
            </Text>
          ) : null}
        </View>

        <Text variant="bodySmall" style={{ color: agri.colors.onSurfaceVariant }}>
          {shipment.origin} → {shipment.destination}
        </Text>

        <View style={styles.row}>
          <Icon source={meta.icon} size={14} color={agri.colors[meta.colorKey]} />
          <Text variant="labelMedium" style={{ color: agri.colors[meta.colorKey], marginLeft: 4 }}>
            {meta.label}
          </Text>
          {shipment.eta && shipment.status !== 'delivered' && !isException ? (
            <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant, marginLeft: 6 }}>
              · Arriving by {shipment.eta}
            </Text>
          ) : null}
        </View>

        {isException && shipment.exception ? (
          <View style={styles.row}>
            <Icon source="alert-outline" size={12} color={agri.colors.shipmentException} />
            <Text variant="labelSmall" style={{ color: agri.colors.shipmentException, marginLeft: 4, flex: 1 }}>
              {shipment.exception}
            </Text>
          </View>
        ) : null}

        <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
          {shipment.lastLocation ? `Last scanned at ${shipment.lastLocation}` : 'No scan data yet'}
          {shipment.lastUpdatedAt ? ` · ${shipment.lastUpdatedAt}` : ''}
        </Text>

        <View style={styles.row}>
          <AppButton variant="ghost" size="sm" onPress={() => onPress(shipment)} testID={childTestID(id, 'track')}>
            Track shipment
          </AppButton>
          {isException && onContactSupport ? (
            <AppButton variant="ghost" size="sm" onPress={() => onContactSupport(shipment)} style={{ marginLeft: 8 }} testID={childTestID(id, 'support')}>
              Contact support
            </AppButton>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
