import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { ProofStatus, RouteStop, RouteStopStatus } from '../types/domain';

export interface RouteStopListItemProps extends StyleEscapeHatches {
  stop: RouteStop;
  totalStops?: number;
  onPress: (stop: RouteStop) => void;
  onNavigate?: (stop: RouteStop) => void;
  onStartStop?: (stop: RouteStop) => void;
  onAddProof?: (stop: RouteStop) => void;
}

const STATUS_META: Record<RouteStopStatus, { label: string; colorKey: 'shipmentDelivered' | 'shipmentInTransit' | 'offline' | 'shipmentException' | 'warning' }> = {
  upcoming: { label: 'Upcoming', colorKey: 'offline' },
  current: { label: 'Current stop', colorKey: 'shipmentInTransit' },
  completed: { label: 'Completed', colorKey: 'shipmentDelivered' },
  failed: { label: 'Failed delivery', colorKey: 'shipmentException' },
  skipped: { label: 'Skipped', colorKey: 'warning' },
  rescheduled: { label: 'Rescheduled', colorKey: 'warning' },
};

const PROOF_META: Record<Exclude<ProofStatus, 'notRequired'>, { label: string; icon: string }> = {
  pending: { label: 'Proof pending', icon: 'camera-outline' },
  complete: { label: 'Proof complete', icon: 'check-circle-outline' },
  error: { label: 'Proof failed to upload', icon: 'cloud-off-outline' },
};

/**
 * Large tap targets sized for gloved, one-handed field use — "Navigate,"
 * "Start stop," and "Add proof" are always independent buttons, never
 * folded into a swipe or long-press gesture. A list fallback always exists
 * even when a map route is available.
 */
export const RouteStopListItem = ({ stop, totalStops, onPress, onNavigate, onStartStop, onAddProof, style, containerStyle, testID }: RouteStopListItemProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? `stop-${stop.id}`;
  const statusMeta = STATUS_META[stop.status];
  const proofMeta = stop.proofStatus && stop.proofStatus !== 'notRequired' ? PROOF_META[stop.proofStatus] : undefined;

  return (
    <TouchableRipple onPress={() => onPress(stop)} style={[styles.row, { borderRadius: theme.radii.sm }, containerStyle, style]} testID={id}>
      <View style={styles.rowInner}>
        <Avatar.Text size={32} label={String(stop.sequence)} style={{ backgroundColor: agri.colors.surfaceVariant }} labelStyle={{ color: theme.colors.onSurface }} />
        <View style={[styles.flex, { marginLeft: 10 }]}>
          <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
            Stop {stop.sequence}
            {totalStops ? ` of ${totalStops}` : ''} · {stop.type === 'pickup' ? 'Pickup' : stop.type === 'delivery' ? 'Delivery' : stop.type === 'return' ? 'Return' : 'Hub'}
          </Text>
          <Text variant="bodyMedium">{stop.title}</Text>
          <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }} numberOfLines={1}>
            {stop.address}
          </Text>

          <View style={styles.flexRow}>
            <Icon source={stop.status === 'completed' ? 'check-circle' : stop.status === 'failed' ? 'alert-circle' : 'circle-outline'} size={12} color={agri.colors[statusMeta.colorKey]} />
            <Text variant="labelSmall" style={{ color: agri.colors[statusMeta.colorKey], marginLeft: 4 }}>
              {statusMeta.label}
              {stop.eta && stop.status === 'upcoming' ? ` · Arriving in ${stop.eta}` : ''}
              {stop.timeWindow ? ` · ${stop.timeWindow}` : ''}
            </Text>
          </View>

          <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
            {stop.shipmentCount != null ? `${stop.shipmentCount} shipment${stop.shipmentCount === 1 ? '' : 's'}` : ''}
            {stop.distance ? `${stop.shipmentCount != null ? ' · ' : ''}${stop.distance}` : ''}
          </Text>

          {proofMeta ? (
            <View style={styles.flexRow}>
              <Icon source={proofMeta.icon} size={11} color={stop.proofStatus === 'error' ? agri.colors.error : agri.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: stop.proofStatus === 'error' ? agri.colors.error : agri.colors.onSurfaceVariant, marginLeft: 4 }}>
                {proofMeta.label}
              </Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            {onNavigate ? (
              <AppButton variant="ghost" size="sm" onPress={() => onNavigate(stop)} testID={childTestID(id, 'navigate')}>
                Navigate
              </AppButton>
            ) : null}
            {onStartStop && stop.status === 'current' ? (
              <AppButton variant="primary" size="sm" onPress={() => onStartStop(stop)} style={{ marginLeft: 8 }} testID={childTestID(id, 'start')}>
                Start stop
              </AppButton>
            ) : null}
            {onAddProof && (stop.status === 'current' || stop.proofStatus === 'error') ? (
              <AppButton variant="ghost" size="sm" onPress={() => onAddProof(stop)} style={{ marginLeft: 8 }} testID={childTestID(id, 'proof')}>
                Add proof
              </AppButton>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { paddingVertical: 6 },
  rowInner: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  flexRow: { flexDirection: 'row', alignItems: 'center' },
  actionRow: { flexDirection: 'row', marginTop: 6 },
});
