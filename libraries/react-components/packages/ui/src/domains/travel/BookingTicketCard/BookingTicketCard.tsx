import QrCode2Icon from '@mui/icons-material/QrCode2';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { clockLabel, describe } from '../../../foundation';

export type TicketStatus = 'confirmed' | 'checkedIn' | 'boarding' | 'cancelled' | 'completed';

export interface BookingTicket {
  reference: string;
  passengerName: string;
  status: TicketStatus;
  from: string;
  to: string;
  departAt: string;
  timezone: string;
  gate?: string;
  seat?: string;
  boardingGroup?: string;
  /** Data for the barcode. Rendered as text as well. */
  barcodeValue: string;
}

export interface BookingTicketCardProps {
  ticket: BookingTicket;
  onShowPass?: () => void;
  onAddToWallet?: () => void;
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  confirmed: 'Confirmed',
  checkedIn: 'Checked in',
  boarding: 'Boarding now',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

/**
 * The boarding pass.
 *
 * The reference is rendered large and in monospace, and the barcode value is
 * printed as **text underneath**. Scanners fail, screens crack, and staff type
 * the reference in — a pass that only exists as a barcode image is a pass that
 * strands someone at a gate.
 *
 * Gate is marked as subject to change, because it is, and a passenger who read
 * "Gate 14" an hour ago and never re-checked is the most common way people miss
 * flights.
 */
export function BookingTicketCard({ ticket, onShowPass, onAddToWallet }: BookingTicketCardProps) {
  const cancelled = ticket.status === 'cancelled';

  return (
    <Card variant="outlined" sx={{ opacity: cancelled ? 0.7 : 1 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack>
            <Typography variant="caption" color="text.secondary">
              Booking reference
            </Typography>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ fontFamily: 'monospace', letterSpacing: 1 }}
              aria-label={describe(
                `Booking reference ${ticket.reference.split('').join(' ')}`,
                ticket.passengerName,
                STATUS_LABEL[ticket.status],
              )}
            >
              {ticket.reference}
            </Typography>
          </Stack>

          <Chip
            size="small"
            color={
              ticket.status === 'boarding'
                ? 'warning'
                : ticket.status === 'cancelled'
                  ? 'error'
                  : ticket.status === 'checkedIn'
                    ? 'success'
                    : 'default'
            }
            label={STATUS_LABEL[ticket.status]}
          />
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" alignItems="center" spacing={2}>
          <Stack alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              {ticket.from}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {clockLabel(ticket.departAt, undefined, ticket.timezone)}
            </Typography>
          </Stack>
          <Box sx={{ flexGrow: 1, borderBottom: '1px dashed', borderColor: 'divider' }} />
          <Stack alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              {ticket.to}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {ticket.timezone}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
          <Stack>
            <Typography variant="caption" color="text.secondary">
              Passenger
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {ticket.passengerName}
            </Typography>
          </Stack>
          {ticket.seat ? (
            <Stack>
              <Typography variant="caption" color="text.secondary">
                Seat
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {ticket.seat}
              </Typography>
            </Stack>
          ) : null}
          {ticket.gate ? (
            <Stack>
              <Typography variant="caption" color="text.secondary">
                Gate
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {ticket.gate}
              </Typography>
              {/* Gates change. Saying so is cheaper than a missed flight. */}
              <Typography variant="caption" color="warning.main">
                Subject to change
              </Typography>
            </Stack>
          ) : null}
          {ticket.boardingGroup ? (
            <Stack>
              <Typography variant="caption" color="text.secondary">
                Group
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {ticket.boardingGroup}
              </Typography>
            </Stack>
          ) : null}
        </Stack>

        {!cancelled ? (
          <Stack alignItems="center" spacing={0.5} sx={{ mt: 2 }}>
            <QrCode2Icon sx={{ fontSize: 84 }} aria-hidden />
            {/* The value as text: scanners fail and staff type it in. */}
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              {ticket.barcodeValue}
            </Typography>
          </Stack>
        ) : null}

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
          {onAddToWallet && !cancelled ? (
            <Button size="small" onClick={onAddToWallet}>
              Add to wallet
            </Button>
          ) : null}
          {onShowPass && !cancelled ? (
            <Button size="small" variant="contained" onClick={onShowPass}>
              Show pass
            </Button>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
