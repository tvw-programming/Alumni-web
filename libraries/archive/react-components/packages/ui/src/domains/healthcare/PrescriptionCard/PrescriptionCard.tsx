import DownloadIcon from '@mui/icons-material/Download';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, timeLabel } from '../../../foundation';

export interface PrescribedItem {
  id: string;
  drug: string;
  strength: string;
  dose: string;
  frequency: string;
  durationDays: number;
  instruction?: string;
}

export interface Prescription {
  id: string;
  prescriber: string;
  registrationNumber?: string;
  issuedAt: string;
  validUntil?: string;
  items: PrescribedItem[];
  /** True once a pharmacy has dispensed against it. */
  dispensed?: boolean;
}

export interface PrescriptionCardProps {
  prescription: Prescription;
  onDownload?: () => void;
  onOrderRefill?: () => void;
}

/**
 * A prescription, rendered in full.
 *
 * Nothing is truncated or hidden behind "show more": dose, frequency, duration
 * and the instruction are the prescription. A UI that abbreviates "twice daily
 * for 5 days" to fit a card is a UI that causes a dosing error.
 *
 * Expiry is stated because a prescription is only valid for a period, and a
 * patient arriving at a pharmacy with an expired one has wasted a trip.
 */
export function PrescriptionCard({
  prescription,
  onDownload,
  onOrderRefill,
}: PrescriptionCardProps) {
  const expired =
    prescription.validUntil !== undefined && new Date(prescription.validUntil) < new Date();

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Stack>
            <Typography variant="subtitle2" fontWeight={700}>
              {prescription.prescriber}
            </Typography>
            {prescription.registrationNumber ? (
              <Typography variant="caption" color="text.secondary">
                {`Reg. ${prescription.registrationNumber}`}
              </Typography>
            ) : null}
            <Typography variant="caption" color="text.secondary">
              {`Issued ${timeLabel(prescription.issuedAt)}`}
            </Typography>
          </Stack>

          <Stack spacing={0.5} alignItems="flex-end">
            {expired ? (
              <Chip size="small" color="error" variant="outlined" label="Expired" />
            ) : prescription.validUntil ? (
              <Chip
                size="small"
                variant="outlined"
                label={`Valid until ${new Date(prescription.validUntil).toLocaleDateString()}`}
              />
            ) : null}
            {prescription.dispensed ? (
              <Chip size="small" variant="outlined" label="Dispensed" />
            ) : null}
          </Stack>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Stack spacing={1.5} component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {prescription.items.map((item) => (
            <Stack
              key={item.id}
              component="li"
              spacing={0.25}
              // The whole item as one phrase — a screen reader must not read
              // "Metformin" and "500 mg" as unrelated fragments.
              aria-label={describe(
                item.drug,
                item.strength,
                item.dose,
                item.frequency,
                `for ${String(item.durationDays)} days`,
                item.instruction,
              )}
            >
              <Typography variant="body2" fontWeight={600} aria-hidden>
                {`${item.drug} ${item.strength}`}
              </Typography>
              <Typography variant="body2" color="text.secondary" aria-hidden>
                {`${item.dose} · ${item.frequency} · ${String(item.durationDays)} days`}
              </Typography>
              {item.instruction ? (
                <Typography variant="caption" color="text.secondary" aria-hidden>
                  {item.instruction}
                </Typography>
              ) : null}
            </Stack>
          ))}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
          {onDownload ? (
            <Button size="small" startIcon={<DownloadIcon />} onClick={onDownload}>
              Download
            </Button>
          ) : null}
          {onOrderRefill && !expired ? (
            <Button size="small" variant="contained" onClick={onOrderRefill}>
              Order refill
            </Button>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
