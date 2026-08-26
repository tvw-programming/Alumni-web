import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useTravelTheme } from '../theme/travelTokens';
import type { FlightOffer, FlightSegment } from '../types/domain';

const BADGE_LABEL: Record<NonNullable<FlightOffer['badge']>, string> = {
  best: 'Best',
  cheapest: 'Cheapest',
  fastest: 'Fastest',
};

export interface FlightResultCardProps extends StyleEscapeHatches {
  offer: FlightOffer;
  travelerCount?: number;
  locale?: string;
  loading?: boolean;
  variant?: 'compact' | 'expanded';
  onSelect?: (offer: FlightOffer) => void;
  onViewDetails?: (offer: FlightOffer) => void;
}

/**
 * Times are the primary hierarchy, stops are never buried, and price is the
 * dominant trailing element — matching how travelers actually decide between
 * offers. A self-transfer or airport change is surfaced on the card itself,
 * never left for a detail screen to reveal.
 */
export const FlightResultCard = ({
  offer,
  travelerCount = 1,
  locale = 'en-IN',
  loading = false,
  variant = 'compact',
  onSelect,
  onViewDetails,
  style,
  containerStyle,
  testID,
}: FlightResultCardProps) => {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  const id = testID ?? `flight-${offer.id}`;

  const first = offer.segments[0]!;
  const last = offer.segments[offer.segments.length - 1]!;
  const selfTransfer = offer.segments.some((s) => s.layoverAfter?.selfTransfer);
  const airportChange = offer.segments.some((s) => s.layoverAfter?.airportChange);

  const disabled = offer.status === 'expired' || offer.status === 'soldOut';

  const statusNote = useMemo(() => {
    switch (offer.status) {
      case 'expired':
        return { text: 'Fare expired — search again for current prices.', tone: 'error' as const };
      case 'soldOut':
        return { text: 'Sold out.', tone: 'error' as const };
      case 'priceChanged':
        return { text: 'Price changed since your search.', tone: 'warn' as const };
      case 'searching':
        return { text: 'Comparing prices…', tone: 'info' as const };
      default:
        return null;
    }
  }, [offer.status]);

  if (loading) {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} testID={childTestID(id, 'loading')}>
        <SkeletonLoader shape="text" lines={3} />
      </AppCard>
    );
  }

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        {offer.badge ? (
          <View
            style={[styles.badge, { backgroundColor: travel.colors.surfaceSelected, borderRadius: theme.radii.pill, alignSelf: 'flex-start' }]}
            accessibilityRole="text"
          >
            <Text variant="labelSmall" style={{ color: travel.colors.onSurfaceSelected }}>
              {BADGE_LABEL[offer.badge]}{' '}
              {offer.badge === 'cheapest' ? '· lowest total price' : offer.badge === 'fastest' ? '· shortest duration' : '· best balance of price and time'}
            </Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {first.carrierName ?? first.carrier}
              {offer.segments.length > 1 ? ` +${offer.segments.length - 1} more` : ''}
            </Text>
            <View style={[styles.row, { marginTop: 2 }]}>
              <TimePair time={first.departure.time} code={first.departure.airportCode} />
              <View style={styles.arrow}>
                <Icon source="arrow-right" size={16} color={theme.colors.onSurfaceVariant} />
              </View>
              <TimePair time={last.arrival.time} code={last.arrival.airportCode} nextDay={last.arrival.nextDay} align="right" />
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              {offer.totalDuration} · {offer.stops === 0 ? 'Nonstop' : `${offer.stops} stop${offer.stops > 1 ? 's' : ''}`}
            </Text>
          </View>

          <View style={styles.priceBlock}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              {formatMoney(offer.price, { locale })}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {travelerCount > 1 ? `Total for ${travelerCount} travelers` : 'Price per traveler'}
            </Text>
          </View>
        </View>

        <RouteDiagram segments={offer.segments} testID={childTestID(id, 'route')} />

        {(selfTransfer || airportChange) && (
          <View style={[styles.notice, { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.sm, padding: theme.spacing.xs }]}>
            <Icon source="alert-circle-outline" size={13} color={theme.colors.onErrorContainer} />
            <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer, marginLeft: 6, flex: 1 }}>
              {airportChange ? 'Requires changing airports during the layover.' : 'Self-transfer — you must collect and recheck baggage.'}
            </Text>
          </View>
        )}

        {variant === 'expanded' && offer.baggage ? (
          <View style={[styles.row, { gap: 4 }]}>
            <Icon source="bag-suitcase-outline" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {offer.baggage.included
                ? `Cabin ${offer.baggage.cabin ?? '—'}, checked ${offer.baggage.checked ?? '—'}`
                : 'Bags not included'}
            </Text>
          </View>
        ) : null}

        {variant === 'expanded' && offer.refundability ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {offer.refundability === 'nonRefundable' ? 'Nonrefundable fare' : offer.refundability === 'refundable' ? 'Fully refundable fare' : 'Partially refundable fare'}
            {offer.fareType ? ` · ${offer.fareType}` : ''}
          </Text>
        ) : null}

        {statusNote ? (
          <View
            style={[
              styles.notice,
              {
                backgroundColor: statusNote.tone === 'error' ? theme.colors.errorContainer : travel.colors.surfaceSelected,
                borderRadius: theme.radii.sm,
                padding: theme.spacing.xs,
              },
            ]}
            accessibilityLiveRegion={statusNote.tone === 'error' ? 'assertive' : 'polite'}
          >
            <Text
              variant="labelSmall"
              style={{ color: statusNote.tone === 'error' ? theme.colors.onErrorContainer : travel.colors.onSurfaceSelected }}
            >
              {statusNote.text}
            </Text>
          </View>
        ) : (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Prices may change.
          </Text>
        )}

        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          {onViewDetails ? (
            <AppButton variant="secondary" size="md" onPress={() => onViewDetails(offer)} containerStyle={styles.flex} testID={childTestID(id, 'details')}>
              View details
            </AppButton>
          ) : null}
          <AppButton
            variant="primary"
            size="md"
            disabled={disabled}
            onPress={() => onSelect?.(offer)}
            containerStyle={styles.flex}
            testID={childTestID(id, 'select')}
          >
            {offer.status === 'soldOut' ? 'Sold out' : 'Select flight'}
          </AppButton>
        </View>
      </View>
    </AppCard>
  );
};

const TimePair = ({ time, code, nextDay, align = 'left' }: { time: string; code: string; nextDay?: boolean; align?: 'left' | 'right' }) => {
  const theme = useAppTheme();
  return (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text variant="titleMedium">
        {time}
        {nextDay ? <Text style={{ color: theme.colors.error }}> +1</Text> : null}
      </Text>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {code}
      </Text>
    </View>
  );
};

const RouteDiagram = ({ segments, testID }: { segments: FlightSegment[]; testID?: string }) => {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  return (
    <View style={styles.route} testID={testID} accessibilityRole="text" accessibilityLabel={`Route: ${segments.map((s) => s.departure.airportCode).join(' to ')} to ${segments[segments.length - 1]?.arrival.airportCode ?? ''}`}>
      {segments.map((segment, index) => (
        <React.Fragment key={index}>
          <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
          <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
          {segment.layoverAfter ? (
            <>
              <View style={[styles.stopDot, { backgroundColor: travel.colors.highDemand }]} />
              <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} />
            </>
          ) : null}
        </React.Fragment>
      ))}
      <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  arrow: { marginHorizontal: 8 },
  priceBlock: { alignItems: 'flex-end' },
  badge: { paddingHorizontal: 8, paddingVertical: 3 },
  notice: { flexDirection: 'row', alignItems: 'center' },
  route: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  stopDot: { width: 6, height: 6, borderRadius: 3 },
  line: { flex: 1, height: 2, marginHorizontal: 2 },
});
