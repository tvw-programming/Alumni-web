import FlightIcon from '@mui/icons-material/Flight';
import LuggageIcon from '@mui/icons-material/Luggage';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { clockLabel, describe, formatMoney, type Money } from '../../../foundation';

export interface FlightLeg {
  from: string;
  to: string;
  departAt: string;
  arriveAt: string;
  /** IATA zone names, so a red-eye is unambiguous. */
  departTimezone: string;
  arriveTimezone: string;
  durationMinutes: number;
  stops: { airport: string; layoverMinutes: number }[];
  carrier: string;
  flightNumber: string;
  /** Days later than departure. Rendered as "+1". */
  arrivesNextDay?: number;
}

export interface FlightOffer {
  id: string;
  legs: FlightLeg[];
  price: Money;
  /** What the fare actually includes. Never left implicit. */
  cabinBag: string;
  checkedBag: string;
  refundable: boolean;
  changeable: boolean;
  seatsLeft?: number;
}

export interface FlightResultCardProps {
  offer: FlightOffer;
  onSelect: () => void;
}

function formatDuration(minutes: number): string {
  return `${String(Math.floor(minutes / 60))}h ${String(minutes % 60)}m`;
}

/**
 * One flight offer.
 *
 * Baggage is on the card, in words. "From ₹4,299" next to a fare that carries
 * no cabin bag is the single most complained-about pattern in flight search,
 * and it is a deliberate omission dressed as a layout decision.
 *
 * `+1` on the arrival time and the timezone on both ends: a 23:55 → 06:10 flight
 * is not a six-hour flight, and a card that hides the day change sells people
 * the wrong itinerary.
 */
export const FlightResultCard = memo(function FlightResultCard({
  offer,
  onSelect,
}: FlightResultCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        {offer.legs.map((leg, index) => (
          <Stack
            key={`${leg.flightNumber}-${String(index)}`}
            spacing={1}
            sx={{ mb: index === offer.legs.length - 1 ? 0 : 2 }}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              aria-label={describe(
                `${leg.carrier} ${leg.flightNumber}`,
                `${leg.from} ${clockLabel(leg.departAt, undefined, leg.departTimezone)} ${leg.departTimezone}`,
                `to ${leg.to} ${clockLabel(leg.arriveAt, undefined, leg.arriveTimezone)} ${leg.arriveTimezone}`,
                leg.arrivesNextDay ? `arrives ${String(leg.arrivesNextDay)} day later` : undefined,
                formatDuration(leg.durationMinutes),
                leg.stops.length === 0
                  ? 'non-stop'
                  : `${String(leg.stops.length)} stop via ${leg.stops.map((stop) => stop.airport).join(', ')}`,
              )}
            >
              <Stack alignItems="center" sx={{ minWidth: 64 }} aria-hidden>
                <Typography variant="h6" fontWeight={700}>
                  {clockLabel(leg.departAt, undefined, leg.departTimezone)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {leg.from}
                </Typography>
              </Stack>

              <Stack sx={{ flexGrow: 1 }} alignItems="center" aria-hidden>
                <Typography variant="caption" color="text.secondary">
                  {formatDuration(leg.durationMinutes)}
                </Typography>
                <Divider sx={{ width: '100%' }}>
                  <FlightIcon
                    fontSize="small"
                    sx={{ transform: 'rotate(90deg)' }}
                    color="disabled"
                  />
                </Divider>
                <Typography
                  variant="caption"
                  color={leg.stops.length === 0 ? 'success.main' : 'text.secondary'}
                >
                  {leg.stops.length === 0
                    ? 'Non-stop'
                    : leg.stops
                        .map((stop) => `${stop.airport} ${formatDuration(stop.layoverMinutes)}`)
                        .join(' · ')}
                </Typography>
              </Stack>

              <Stack alignItems="center" sx={{ minWidth: 64 }} aria-hidden>
                <Stack direction="row" alignItems="flex-start">
                  <Typography variant="h6" fontWeight={700}>
                    {clockLabel(leg.arriveAt, undefined, leg.arriveTimezone)}
                  </Typography>
                  {/* The day change, never hidden. */}
                  {leg.arrivesNextDay ? (
                    <Typography variant="caption" color="error.main" fontWeight={700}>
                      {`+${String(leg.arrivesNextDay)}`}
                    </Typography>
                  ) : null}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {leg.to}
                </Typography>
              </Stack>
            </Stack>

            <Typography variant="caption" color="text.secondary" aria-hidden>
              {`${leg.carrier} ${leg.flightNumber} · times shown in ${leg.departTimezone}`}
            </Typography>
          </Stack>
        ))}

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {/* Baggage in words, on the card. */}
          <Chip size="small" variant="outlined" icon={<LuggageIcon />} label={offer.cabinBag} />
          <Chip size="small" variant="outlined" label={offer.checkedBag} />
          <Chip
            size="small"
            variant="outlined"
            color={offer.refundable ? 'success' : 'default'}
            label={offer.refundable ? 'Refundable' : 'Non-refundable'}
          />
          {offer.seatsLeft !== undefined && offer.seatsLeft <= 5 ? (
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={`${String(offer.seatsLeft)} seats left`}
            />
          ) : null}

          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ml: 'auto' }}>
            <Typography variant="h6" fontWeight={700}>
              {formatMoney(offer.price)}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={onSelect}
              aria-label={describe(
                `Select flight ${offer.legs[0].carrier} ${offer.legs[0].flightNumber}`,
                formatMoney(offer.price),
                offer.cabinBag,
                offer.checkedBag,
                offer.refundable ? 'refundable' : 'non-refundable',
              )}
            >
              Select
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
});
