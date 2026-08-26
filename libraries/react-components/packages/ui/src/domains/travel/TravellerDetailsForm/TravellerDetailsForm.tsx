import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { fieldError, useAction } from '../../../foundation';

export interface Traveller {
  id: string;
  title: string;
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  passportNumber?: string;
  passportExpiry?: string;
  nationality?: string;
}

export interface TravellerDetailsFormProps {
  travellers: Traveller[];
  /** True for international itineraries: passport becomes required. */
  requiresPassport?: boolean;
  /** Travel date, so passport validity can be checked against it. */
  travelDate?: string;
  onSubmit: (travellers: Traveller[]) => Promise<void>;
}

/**
 * Passenger details.
 *
 * The rule that saves people at the airport: **names must match the travel
 * document**, and the form says so at the field rather than in terms nobody
 * reads. A mismatched name is a denied boarding and usually a non-refundable
 * ticket.
 *
 * Passport expiry is validated against the *travel date* plus six months, which
 * is the rule most destinations actually apply — and the one airlines enforce at
 * check-in.
 */
export function TravellerDetailsForm({
  travellers: initial,
  requiresPassport = false,
  travelDate,
  onSubmit,
}: TravellerDetailsFormProps) {
  const [travellers, setTravellers] = useState(initial);

  const [result, submit, pending] = useAction<void, 'saved'>(async () => {
    const errors: Record<string, string> = {};

    for (const traveller of travellers) {
      if (traveller.givenName.trim() === '') {
        errors[`${traveller.id}.givenName`] = 'Required, exactly as on the travel document.';
      }
      if (traveller.familyName.trim() === '') {
        errors[`${traveller.id}.familyName`] = 'Required, exactly as on the travel document.';
      }
      if (traveller.dateOfBirth === '') {
        errors[`${traveller.id}.dateOfBirth`] = 'Required.';
      }
      if (requiresPassport) {
        if ((traveller.passportNumber ?? '') === '') {
          errors[`${traveller.id}.passportNumber`] = 'Required for international travel.';
        }
        if (
          travelDate !== undefined &&
          traveller.passportExpiry !== undefined &&
          traveller.passportExpiry !== ''
        ) {
          // Six months past the travel date — the rule airlines enforce.
          const sixMonthsAfter = new Date(travelDate);
          sixMonthsAfter.setMonth(sixMonthsAfter.getMonth() + 6);
          if (new Date(traveller.passportExpiry) < sixMonthsAfter) {
            errors[`${traveller.id}.passportExpiry`] =
              'Must be valid for at least 6 months after travel.';
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return { status: 'error', message: 'Check the highlighted fields.', fieldErrors: errors };
    }

    await onSubmit(travellers);
    return 'saved';
  });

  const update = (id: string, key: keyof Traveller, value: string) => {
    setTravellers((current) =>
      current.map((traveller) =>
        traveller.id === id ? { ...traveller, [key]: value } : traveller,
      ),
    );
  };

  return (
    <Stack spacing={2}>
      {result.status === 'error' ? (
        <Alert severity="error" role="alert">
          {result.message}
        </Alert>
      ) : null}
      {result.status === 'success' ? (
        <Alert severity="success">Traveller details saved.</Alert>
      ) : null}

      {travellers.map((traveller, index) => (
        <Paper key={traveller.id} variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            {`Traveller ${String(index + 1)}`}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Enter names exactly as they appear on the passport or ID used to travel.
          </Typography>

          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                select
                size="small"
                label="Title"
                sx={{ minWidth: 100 }}
                value={traveller.title}
                onChange={(event) => {
                  update(traveller.id, 'title', event.target.value);
                }}
              >
                {['Mr', 'Ms', 'Mrs', 'Dr', 'Mx'].map((title) => (
                  <MenuItem key={title} value={title}>
                    {title}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                size="small"
                label="Given name"
                value={traveller.givenName}
                error={fieldError(result, `${traveller.id}.givenName`) !== undefined}
                helperText={fieldError(result, `${traveller.id}.givenName`)}
                onChange={(event) => {
                  update(traveller.id, 'givenName', event.target.value);
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Family name"
                value={traveller.familyName}
                error={fieldError(result, `${traveller.id}.familyName`) !== undefined}
                helperText={fieldError(result, `${traveller.id}.familyName`)}
                onChange={(event) => {
                  update(traveller.id, 'familyName', event.target.value);
                }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date of birth"
                slotProps={{ inputLabel: { shrink: true } }}
                value={traveller.dateOfBirth}
                error={fieldError(result, `${traveller.id}.dateOfBirth`) !== undefined}
                helperText={fieldError(result, `${traveller.id}.dateOfBirth`)}
                onChange={(event) => {
                  update(traveller.id, 'dateOfBirth', event.target.value);
                }}
              />

              {requiresPassport ? (
                <>
                  <TextField
                    fullWidth
                    size="small"
                    label="Passport number"
                    value={traveller.passportNumber ?? ''}
                    error={fieldError(result, `${traveller.id}.passportNumber`) !== undefined}
                    helperText={fieldError(result, `${traveller.id}.passportNumber`)}
                    onChange={(event) => {
                      update(traveller.id, 'passportNumber', event.target.value);
                    }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Passport expiry"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={traveller.passportExpiry ?? ''}
                    error={fieldError(result, `${traveller.id}.passportExpiry`) !== undefined}
                    helperText={fieldError(result, `${traveller.id}.passportExpiry`)}
                    onChange={(event) => {
                      update(traveller.id, 'passportExpiry', event.target.value);
                    }}
                  />
                </>
              ) : null}
            </Stack>
          </Stack>
        </Paper>
      ))}

      <Button
        variant="contained"
        disabled={pending}
        onClick={() => {
          submit();
        }}
      >
        {pending ? 'Saving…' : 'Save and continue'}
      </Button>
    </Stack>
  );
}
