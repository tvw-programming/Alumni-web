import BatteryAlertIcon from '@mui/icons-material/BatteryAlert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { describe, timeLabel } from '../../../foundation';

export interface SensorReading {
  id: string;
  label: string;
  value: number;
  unit: string;
  measuredAt: string;
  /** Below this the value is stale and must not be presented as current. */
  staleAfterMinutes?: number;
  batteryPercent?: number;
  room?: string;
}

export interface SensorReadingCardProps {
  reading: SensorReading;
  now?: Date;
}

/**
 * A sensor value, with its age.
 *
 * A sensor that stopped reporting three hours ago still has a last value, and
 * showing it as though it were current is the most common way an IoT dashboard
 * misleads. Past `staleAfterMinutes` the card says **"Last seen 3 hours ago"**
 * and dims the number.
 *
 * Battery is shown only when it is low. A percentage on every card is noise;
 * "Battery 8%" on the one that needs a cell is a prompt.
 */
export const SensorReadingCard = memo(function SensorReadingCard({
  reading,
  now = new Date(),
}: SensorReadingCardProps) {
  const ageMinutes = (now.getTime() - new Date(reading.measuredAt).getTime()) / 60_000;
  const stale = reading.staleAfterMinutes !== undefined && ageMinutes > reading.staleAfterMinutes;
  const lowBattery = reading.batteryPercent !== undefined && reading.batteryPercent <= 20;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography
          variant="caption"
          color="text.secondary"
          aria-label={describe(
            reading.label,
            reading.room,
            stale
              ? `last known value ${String(reading.value)} ${reading.unit}`
              : `${String(reading.value)} ${reading.unit}`,
            stale
              ? `not reporting, last seen ${timeLabel(reading.measuredAt, undefined, now)}`
              : `measured ${timeLabel(reading.measuredAt, undefined, now)}`,
            lowBattery ? `battery ${String(reading.batteryPercent)} percent` : undefined,
          )}
        >
          {[reading.label, reading.room].filter(Boolean).join(' · ')}
        </Typography>

        <Stack direction="row" spacing={0.5} alignItems="baseline" sx={{ mt: 0.5 }} aria-hidden>
          <Typography variant="h4" fontWeight={700} sx={{ opacity: stale ? 0.5 : 1 }}>
            {reading.value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {reading.unit}
          </Typography>
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mt: 1 }}
          flexWrap="wrap"
          useFlexGap
        >
          {stale ? (
            // The value is not current, and the card says so rather than
            // presenting a three-hour-old number as live.
            <Chip
              size="small"
              color="warning"
              variant="outlined"
              label={`Last seen ${timeLabel(reading.measuredAt, undefined, now).split(' (')[0]}`}
              aria-hidden
            />
          ) : (
            <Typography variant="caption" color="text.secondary" aria-hidden>
              {timeLabel(reading.measuredAt, undefined, now).split(' (')[0]}
            </Typography>
          )}

          {lowBattery ? (
            <Chip
              size="small"
              color="error"
              variant="outlined"
              icon={<BatteryAlertIcon />}
              label={`Battery ${String(reading.batteryPercent)}%`}
              aria-hidden
            />
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
});
