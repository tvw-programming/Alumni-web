import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MedicationIcon from '@mui/icons-material/Medication';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ListItem from '@mui/material/ListItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { clockLabel, describe, useAction } from '../../../foundation';

export type DoseState = 'due' | 'taken' | 'skipped' | 'missed' | 'upcoming';

export interface MedicationDose {
  id: string;
  medication: string;
  strength: string;
  instruction: string;
  scheduledAt: string;
  state: DoseState;
  takenAt?: string;
}

export interface MedicationReminderItemProps {
  dose: MedicationDose;
  onMarkTaken: () => Promise<void>;
  onSkip?: (reason: string) => Promise<void>;
}

/**
 * One scheduled dose.
 *
 * Marking a dose is an **Action, not an optimistic toggle**. An adherence
 * record is clinical evidence: a prescriber may change a dose based on it, so a
 * tick that appears before the server has the record — and silently disappears
 * on a failed request — is a record that lies about what a patient took.
 *
 * The instruction ("with food", "do not lie down for 30 minutes") is on the row
 * rather than behind a tap, because it is only useful at the moment of taking.
 */
export function MedicationReminderItem({ dose, onMarkTaken, onSkip }: MedicationReminderItemProps) {
  const [result, markTaken, pending] = useAction<void, 'taken'>(async () => {
    await onMarkTaken();
    return 'taken';
  });

  const state: DoseState = result.status === 'success' ? 'taken' : dose.state;
  const done = state === 'taken';

  return (
    <ListItem
      divider
      sx={{ alignItems: 'flex-start', gap: 1.5, opacity: state === 'upcoming' ? 0.7 : 1 }}
      aria-label={describe(
        dose.medication,
        dose.strength,
        clockLabel(dose.scheduledAt),
        dose.instruction,
        state === 'taken'
          ? `taken${dose.takenAt ? ` at ${clockLabel(dose.takenAt)}` : ''}`
          : state === 'missed'
            ? 'missed'
            : state === 'skipped'
              ? 'skipped'
              : 'due',
      )}
    >
      {done ? <CheckCircleIcon color="success" /> : <MedicationIcon color="action" />}

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} aria-hidden>
          {`${dose.medication} ${dose.strength}`}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" aria-hidden>
          {`${clockLabel(dose.scheduledAt)} · ${dose.instruction}`}
        </Typography>

        {state === 'missed' ? (
          <Chip
            size="small"
            color="error"
            variant="outlined"
            label="Missed"
            sx={{ mt: 0.5 }}
            aria-hidden
          />
        ) : null}
        {state === 'skipped' ? (
          <Chip size="small" variant="outlined" label="Skipped" sx={{ mt: 0.5 }} aria-hidden />
        ) : null}
        {done && dose.takenAt ? (
          <Typography variant="caption" color="success.main" display="block" aria-hidden>
            {`Taken at ${clockLabel(dose.takenAt)}`}
          </Typography>
        ) : null}

        {result.status === 'error' ? (
          <Typography variant="caption" color="error.main" role="alert">
            {result.message}
          </Typography>
        ) : null}
      </Box>

      {!done ? (
        <Stack direction="row" spacing={1}>
          {onSkip ? (
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                // A reason is required: "skipped" with no reason is useless to
                // a prescriber reviewing adherence.
                void onSkip('Not needed today');
              }}
            >
              Skip
            </Button>
          ) : null}
          <Button
            size="small"
            variant="contained"
            disabled={pending}
            onClick={() => {
              markTaken();
            }}
          >
            {pending ? 'Saving…' : 'Mark taken'}
          </Button>
        </Stack>
      ) : null}
    </ListItem>
  );
}
