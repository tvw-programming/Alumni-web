import CallIcon from '@mui/icons-material/Call';
import EmergencyIcon from '@mui/icons-material/Emergency';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe } from '../../../foundation';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary?: boolean;
}

export interface EmergencyCardProps {
  /** The local emergency number. Varies by country — never hard-code 911. */
  emergencyNumber: string;
  emergencyLabel: string;
  contacts: EmergencyContact[];
  /** Shown to a responder: allergies, conditions, blood group. */
  medicalNotes?: string[];
  onCall: (phone: string) => void;
}

/**
 * Emergency contacts and the local emergency number.
 *
 * Two decisions specific to an emergency screen:
 *
 * - **The emergency number is a prop.** Hard-coding 911 ships a US-only app;
 *   112, 999, 108 and 000 are all correct somewhere, and a wrong number here is
 *   the worst possible bug.
 * - **Nothing is behind a confirmation.** A user reaching this screen is not in
 *   a position to answer "Are you sure?", and an accidental emergency call is a
 *   far smaller harm than a delayed one.
 */
export function EmergencyContactCard({
  emergencyNumber,
  emergencyLabel,
  contacts,
  medicalNotes,
  onCall,
}: EmergencyCardProps) {
  const ordered = [...contacts].sort(
    (a, b) => Number(b.isPrimary ?? false) - Number(a.isPrimary ?? false),
  );

  return (
    <Card variant="outlined" sx={{ borderColor: 'error.main' }}>
      <CardContent>
        <Button
          fullWidth
          size="large"
          variant="contained"
          color="error"
          startIcon={<EmergencyIcon />}
          onClick={() => {
            onCall(emergencyNumber);
          }}
          aria-label={`Call ${emergencyLabel} on ${emergencyNumber}`}
          sx={{ py: 1.5, fontSize: 18 }}
        >
          {`${emergencyLabel} · ${emergencyNumber}`}
        </Button>

        {medicalNotes?.length ? (
          <Stack spacing={0.5} sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Show this to a responder
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {medicalNotes.map((note) => (
                <Chip key={note} size="small" color="error" variant="outlined" label={note} />
              ))}
            </Stack>
          </Stack>
        ) : null}

        <Divider sx={{ my: 2 }} />

        <Typography variant="caption" color="text.secondary">
          Your emergency contacts
        </Typography>

        <Stack spacing={1} sx={{ mt: 1 }}>
          {ordered.map((contact) => (
            <Stack
              key={contact.id}
              direction="row"
              alignItems="center"
              spacing={1}
              justifyContent="space-between"
            >
              <Stack sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {contact.name}
                  </Typography>
                  {contact.isPrimary === true ? (
                    <Chip size="small" label="Primary" variant="outlined" />
                  ) : null}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {`${contact.relationship} · ${contact.phone}`}
                </Typography>
              </Stack>

              <Button
                size="small"
                variant="outlined"
                startIcon={<CallIcon />}
                onClick={() => {
                  onCall(contact.phone);
                }}
                aria-label={describe(`Call ${contact.name}`, contact.relationship, contact.phone)}
              >
                Call
              </Button>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
