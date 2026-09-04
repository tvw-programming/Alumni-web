import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useTravelTheme } from '../theme/travelTokens';
import type { BookingTicket, TicketStatus } from '../types/domain';
import { BarcodeView } from './BarcodeView';

const STATUS_META: Record<TicketStatus, { label: string; icon: string; colorKey: 'statusConfirmed' | 'statusChanged' | 'statusCanceled' | 'statusExpired' }> = {
  confirmed: { label: 'Booking confirmed', icon: 'check-circle', colorKey: 'statusConfirmed' },
  changed: { label: 'Booking details updated', icon: 'alert-circle-outline', colorKey: 'statusChanged' },
  canceled: { label: 'Canceled', icon: 'cancel', colorKey: 'statusCanceled' },
  expired: { label: 'Expired', icon: 'clock-alert-outline', colorKey: 'statusExpired' },
};

export interface BookingTicketCardProps extends StyleEscapeHatches {
  ticket: BookingTicket;
  locale?: string;
  onDownload?: () => void;
  onAddToWallet?: () => void;
  onShare?: () => void;
  onCopyCode?: () => void;
}

/**
 * A ticket-shaped visual with a perforation break between summary and
 * barcode, but the dashed cut supports hierarchy, not decoration — every
 * detail on a canceled or expired ticket is still legible, and the card is
 * explicit that it is not itself a boarding pass.
 */
export const BookingTicketCard = ({ ticket, locale = 'en-IN', onDownload, onAddToWallet, onShare, onCopyCode, style, containerStyle, testID }: BookingTicketCardProps) => {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  const id = testID ?? `ticket-${ticket.id}`;
  const meta = STATUS_META[ticket.status];
  const inactive = ticket.status === 'canceled' || ticket.status === 'expired';

  return (
    <View
      style={[styles.root, { backgroundColor: travel.colors.surfaceTicket, borderRadius: theme.radii.lg, opacity: inactive ? 0.75 : 1 }, containerStyle, style]}
      testID={id}
    >
      <View style={{ padding: theme.spacing.md, gap: 4 }}>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.flex}>
            {ticket.provider}
          </Text>
          <View style={styles.row}>
            <Icon source={meta.icon} size={14} color={travel.colors[meta.colorKey]} />
            <Text variant="labelSmall" style={{ color: travel.colors[meta.colorKey], marginLeft: 4 }}>
              {meta.label}
            </Text>
          </View>
        </View>

        {ticket.travelerName ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {ticket.travelerName}
          </Text>
        ) : null}

        {ticket.origin && ticket.destination ? (
          <View style={[styles.row, { marginTop: 6 }]}>
            <Text variant="headlineSmall">{ticket.origin}</Text>
            <View style={{ marginHorizontal: 8 }}>
              <Icon source="arrow-right" size={18} color={theme.colors.onSurfaceVariant} />
            </View>
            <Text variant="headlineSmall">{ticket.destination}</Text>
          </View>
        ) : null}

        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(ticket.startAt))}
        </Text>

        {ticket.details.length > 0 ? (
          <View style={[styles.detailGrid, { marginTop: theme.spacing.sm }]}>
            {ticket.details.map((detail) => (
              <View key={detail.id} style={styles.detailCell}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {detail.label}
                </Text>
                <Text variant="bodyMedium">{detail.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <Perforation />

      <View style={{ padding: theme.spacing.md, alignItems: 'center', gap: theme.spacing.sm }}>
        <BarcodeView
          barcode={ticket.barcode}
          confirmationCode={ticket.confirmationCode}
          size={travel.layout.ticketBarcodeSize}
          expired={ticket.status === 'expired' || ticket.status === 'canceled'}
          onCopyCode={onCopyCode}
          testID={childTestID(id, 'barcode')}
        />

        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {ticket.type === 'flight' ? 'This ticket is not a boarding pass.' : 'Scan at entry.'}
        </Text>

        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          {onDownload ? (
            <AppButton variant="secondary" size="sm" onPress={onDownload} testID={childTestID(id, 'download')}>
              Download ticket
            </AppButton>
          ) : null}
          {onAddToWallet ? (
            <AppButton variant="secondary" size="sm" onPress={onAddToWallet} testID={childTestID(id, 'wallet')}>
              Add to wallet
            </AppButton>
          ) : null}
          {onShare ? (
            <AppButton variant="ghost" size="sm" onPress={onShare} testID={childTestID(id, 'share')}>
              Share
            </AppButton>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const Perforation = () => {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  return (
    <View style={styles.perforationRow}>
      <View style={[styles.notch, { backgroundColor: theme.colors.background, left: -10 }]} />
      <View style={[styles.dashLine, { borderColor: travel.colors.surfaceTicketPerforation }]} />
      <View style={[styles.notch, { backgroundColor: theme.colors.background, right: -10 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  detailCell: { minWidth: 90 },
  perforationRow: { height: 20, justifyContent: 'center', position: 'relative' },
  dashLine: { borderTopWidth: 1, borderStyle: 'dashed', marginHorizontal: 12 },
  notch: { position: 'absolute', width: 20, height: 20, borderRadius: 10, top: 0 },
});
