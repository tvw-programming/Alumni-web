import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, timeLabel } from '../../../foundation';

export interface PersonalRecord {
  id: string;
  exercise: string;
  /** Already formatted: "102.5 kg", "5:12 /km", "42 reps". */
  valueLabel: string;
  achievedAt: string;
  /** The record this replaced, if any. */
  previousValueLabel?: string;
  improvementLabel?: string;
  isNew?: boolean;
}

export interface PersonalRecordCardProps {
  record: PersonalRecord;
}

/**
 * A personal best.
 *
 * The previous value is kept. A record with nothing to compare against is a
 * number; "102.5 kg, up from 97.5 kg" is an achievement, and it is the version
 * people screenshot.
 *
 * The value arrives **pre-formatted** because a PR can be a weight, a pace or a
 * rep count, and a component that tried to format all three would need to know
 * about units it has no business knowing.
 */
export function PersonalRecordCard({ record }: PersonalRecordCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{ borderColor: record.isNew === true ? 'warning.main' : 'divider' }}
    >
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <EmojiEventsIcon sx={{ color: 'warning.main' }} aria-hidden />

          <Stack
            sx={{ flexGrow: 1, minWidth: 0 }}
            aria-label={describe(
              `Personal record, ${record.exercise}`,
              record.valueLabel,
              record.previousValueLabel ? `up from ${record.previousValueLabel}` : undefined,
              record.improvementLabel,
              `set ${timeLabel(record.achievedAt)}`,
              record.isNew === true ? 'new record' : undefined,
            )}
          >
            <Typography variant="caption" color="text.secondary" aria-hidden>
              {record.exercise}
            </Typography>
            <Typography variant="h5" fontWeight={700} aria-hidden>
              {record.valueLabel}
            </Typography>

            {/* The comparison is what makes it an achievement. */}
            {record.previousValueLabel ? (
              <Typography variant="caption" color="success.main" aria-hidden>
                {`up from ${record.previousValueLabel}${
                  record.improvementLabel ? ` · ${record.improvementLabel}` : ''
                }`}
              </Typography>
            ) : null}

            <Typography variant="caption" color="text.secondary" aria-hidden>
              {timeLabel(record.achievedAt)}
            </Typography>
          </Stack>

          {record.isNew === true ? <Chip size="small" color="warning" label="New" /> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
