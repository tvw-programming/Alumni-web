import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useAction } from '../../../foundation';

export interface ConsentClause {
  id: string;
  text: string;
  /** Optional clauses are genuinely optional — never pre-ticked. */
  required: boolean;
}

export interface ConsentDialogProps {
  open: boolean;
  title: string;
  purpose: string;
  clauses: ConsentClause[];
  /** Version of the consent text. Stored with the acceptance. */
  version: string;
  onAccept: (accepted: string[], version: string) => Promise<void>;
  onDecline: () => void;
}

/**
 * Informed consent.
 *
 * Three rules, all of them legal rather than aesthetic:
 *
 * 1. **Nothing is pre-ticked.** A pre-ticked box is not consent in any
 *    jurisdiction that has looked at the question.
 * 2. **Optional clauses are separable.** Bundling research consent into
 *    treatment consent makes the treatment consent invalid.
 * 3. **The version is stored with the acceptance.** "The patient agreed" is
 *    meaningless without knowing what they agreed to; a later edit of the text
 *    must not retroactively change what was consented.
 *
 * Declining is a first-class button, not a dismissal — an X in the corner does
 * not record a refusal.
 */
export function ConsentDialog({
  open,
  title,
  purpose,
  clauses,
  version,
  onAccept,
  onDecline,
}: ConsentDialogProps) {
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const [result, submit, pending] = useAction<void, 'accepted'>(async () => {
    await onAccept([...accepted], version);
    return 'accepted';
  });

  const missingRequired = clauses.filter((clause) => clause.required && !accepted.has(clause.id));

  return (
    <Dialog open={open} onClose={pending ? undefined : onDecline} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {purpose}
          </Typography>

          <Stack spacing={1}>
            {clauses.map((clause) => (
              <FormControlLabel
                key={clause.id}
                sx={{ alignItems: 'flex-start', m: 0 }}
                control={
                  <Checkbox
                    checked={accepted.has(clause.id)}
                    sx={{ mt: -1 }}
                    onChange={(event) => {
                      setAccepted((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(clause.id);
                        else next.delete(clause.id);
                        return next;
                      });
                    }}
                  />
                }
                label={
                  <Box sx={{ pt: 0.5 }}>
                    <Typography variant="body2">{clause.text}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {clause.required ? 'Required' : 'Optional'}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </Stack>

          <Typography variant="caption" color="text.secondary">
            {`Consent text version ${version}`}
          </Typography>

          {result.status === 'error' ? (
            <Alert severity="error" role="alert">
              {result.message}
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions>
        {/* A real button. An X in the corner does not record a refusal. */}
        <Button onClick={onDecline} disabled={pending}>
          Decline
        </Button>
        <Button
          variant="contained"
          disabled={pending || missingRequired.length > 0}
          onClick={() => {
            submit();
          }}
        >
          {pending ? 'Recording…' : 'I agree'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
