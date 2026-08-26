import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useAction } from '../../../foundation';

export interface ReportReason {
  value: string;
  label: string;
  /** Shown under the option — the categories are rarely self-explanatory. */
  description?: string;
}

export interface ReportBlockSheetProps {
  open: boolean;
  subjectLabel: string;
  reasons: ReportReason[];
  onClose: () => void;
  onSubmit: (input: { reason: string; details: string; alsoBlock: boolean }) => Promise<void>;
}

/**
 * Report, and optionally block.
 *
 * Blocking is a **separate checkbox**, not an automatic consequence of
 * reporting. They are different decisions: a user may want a moderator to see
 * something without cutting contact, and bundling them removes that choice.
 *
 * The confirmation says what happens next. "Thanks for reporting" with no
 * timeline teaches people that reporting does nothing.
 */
export function ReportBlockSheet({
  open,
  subjectLabel,
  reasons,
  onClose,
  onSubmit,
}: ReportBlockSheetProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);

  const [result, submit, pending] = useAction<void, 'reported'>(async () => {
    await onSubmit({ reason, details, alsoBlock });
    return 'reported';
  });

  if (result.status === 'success') {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>Report received</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {`A moderator will review this within 24 hours.${
              alsoBlock ? ` You will no longer see ${subjectLabel}.` : ''
            }`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={onClose}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{`Report ${subjectLabel}`}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <FormLabel id="reason-label">What is happening?</FormLabel>
          <RadioGroup
            aria-labelledby="reason-label"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
          >
            {reasons.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio size="small" sx={{ alignSelf: 'flex-start' }} />}
                sx={{ alignItems: 'flex-start', mb: 0.5 }}
                label={
                  <Stack sx={{ pt: 0.75 }}>
                    <Typography variant="body2">{option.label}</Typography>
                    {option.description ? (
                      <Typography variant="caption" color="text.secondary">
                        {option.description}
                      </Typography>
                    ) : null}
                  </Stack>
                }
              />
            ))}
          </RadioGroup>

          <TextField
            size="small"
            multiline
            minRows={2}
            label="Anything else? (optional)"
            value={details}
            onChange={(event) => {
              setDetails(event.target.value);
            }}
          />

          {/* A separate decision, never automatic. */}
          <FormControlLabel
            control={
              <Checkbox
                checked={alsoBlock}
                onChange={(event) => {
                  setAlsoBlock(event.target.checked);
                }}
              />
            }
            label={`Also block ${subjectLabel}`}
          />

          {result.status === 'error' ? (
            <Alert severity="error" role="alert">
              {result.message}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={pending || reason === ''}
          onClick={() => {
            submit();
          }}
        >
          {pending ? 'Sending…' : 'Submit report'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
