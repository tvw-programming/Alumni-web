import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, statusOf, timeLabel, type StatusMap } from '../../../foundation';

export type VitalType = 'bloodPressure' | 'glucose' | 'heartRate' | 'temperature' | 'spo2';
export type VitalInterpretation = 'usual' | 'outsideRange' | 'reviewRequired';

export interface Vital {
  type: VitalType;
  /** Keyed by component: `{ systolic: 128, diastolic: 82 }`. */
  values: Record<string, number>;
  unit: string;
  measuredAt: string;
  source?: string;
  trend?: 'up' | 'down' | 'stable' | 'unknown';
  interpretation?: VitalInterpretation;
}

export interface VitalsCardProps {
  vital: Vital;
  onPress?: () => void;
}

const LABELS: Record<VitalType, string> = {
  bloodPressure: 'Blood pressure',
  glucose: 'Blood glucose',
  heartRate: 'Heart rate',
  temperature: 'Temperature',
  spo2: 'Oxygen saturation',
};

/**
 * Interpretation, never diagnosis.
 *
 * "Outside your usual range" is an observation about the user's own history.
 * "High" is a clinical judgement, and a component that renders one is
 * practising medicine — so the wording here stays descriptive and the
 * `reviewRequired` state says who should look, not what is wrong.
 */
const INTERPRETATION: StatusMap<VitalInterpretation> = {
  usual: { label: 'In your usual range', color: 'success' },
  outsideRange: { label: 'Outside your usual range', color: 'warning' },
  reviewRequired: { label: 'Share with your clinician', color: 'error' },
};

function formatValues(vital: Vital): string {
  if (vital.type === 'bloodPressure') {
    return `${String(vital.values.systolic)}/${String(vital.values.diastolic)}`;
  }
  return Object.values(vital.values)
    .map((value) => String(value))
    .join(' ');
}

/**
 * A single vital reading.
 *
 * **Vitals are never optimistic.** A reading is a measurement, and predicting
 * one shows a number that was never taken. Manual entry is an Action, and the
 * card shows "Saved" only after the mutation succeeds and the value is refetched.
 */
export function VitalsCard({ vital, onPress }: VitalsCardProps) {
  const interpretation = vital.interpretation
    ? statusOf(INTERPRETATION, vital.interpretation)
    : undefined;

  const TrendIcon =
    vital.trend === 'up'
      ? TrendingUpIcon
      : vital.trend === 'down'
        ? TrendingDownIcon
        : TrendingFlatIcon;

  const label = describe(
    LABELS[vital.type],
    `${formatValues(vital)} ${vital.unit}`,
    interpretation?.label,
    vital.trend && vital.trend !== 'unknown' ? `trending ${vital.trend}` : undefined,
    `measured ${timeLabel(vital.measuredAt)}`,
    vital.source ? `from ${vital.source}` : undefined,
  );

  const body = (
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Typography variant="body2" color="text.secondary" aria-hidden>
          {LABELS[vital.type]}
        </Typography>
        {vital.trend && vital.trend !== 'unknown' ? (
          <TrendIcon fontSize="small" color="action" aria-hidden />
        ) : null}
      </Stack>

      <Stack direction="row" spacing={0.5} alignItems="baseline" sx={{ mt: 0.5 }}>
        <Typography variant="h4" fontWeight={700} aria-hidden>
          {formatValues(vital)}
        </Typography>
        <Typography variant="body2" color="text.secondary" aria-hidden>
          {vital.unit}
        </Typography>
      </Stack>

      {interpretation ? (
        <Chip
          size="small"
          label={interpretation.label}
          color={interpretation.color}
          variant="outlined"
          sx={{ mt: 1 }}
          aria-hidden
        />
      ) : null}

      {/* Source and time are not decoration: a reading from a wrist device an
          hour ago and a manual entry from yesterday are different evidence. */}
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        sx={{ mt: 1 }}
        aria-hidden
      >
        {timeLabel(vital.measuredAt)}
        {vital.source ? ` · ${vital.source}` : ''}
      </Typography>
    </CardContent>
  );

  return (
    <Card variant="outlined" aria-label={label}>
      {onPress ? <CardActionArea onClick={onPress}>{body}</CardActionArea> : body}
    </Card>
  );
}
