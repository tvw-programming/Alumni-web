import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

import { clockLabel, pluralize, type SlotId } from '../../../foundation';

export type SlotStatus = 'available' | 'held' | 'booked' | 'expired';

export interface AppointmentSlot {
  id: SlotId;
  start: string;
  end: string;
  status: SlotStatus;
  timezone: string;
}

export interface CalendarDate {
  date: string;
  label: string;
  availableCount: number;
}

export interface AppointmentSlotGridProps {
  dates: CalendarDate[];
  slots: Record<string, AppointmentSlot[]>;
  selectedDate?: string;
  selectedSlotId?: SlotId;
  /** Set when the chosen slot was taken while the user was deciding. */
  conflictMessage?: string;
  onDateChange: (date: string) => void;
  onSlotChange: (slotId: SlotId) => void;
}

/**
 * Pick a day, then a time.
 *
 * Selection is local; **booking is not this component's job**. That split is
 * deliberate: a held slot is not a reservation, and the only thing that makes
 * an appointment real is the server saying so. `useOptimistic` here would
 * predict a reservation that another patient may already have taken.
 *
 * The timezone is printed next to every time. A telemedicine slot at "4:30 PM"
 * with no zone is how patients miss appointments.
 */
export function AppointmentSlotGrid({
  dates,
  slots,
  selectedDate,
  selectedSlotId,
  conflictMessage,
  onDateChange,
  onSlotChange,
}: AppointmentSlotGridProps) {
  const activeDate = selectedDate ?? dates[0]?.date;
  const daySlots = activeDate ? (slots[activeDate] ?? []) : [];
  const available = daySlots.filter((slot) => slot.status === 'available');

  return (
    <Stack spacing={2}>
      <Tabs
        value={activeDate ?? false}
        onChange={(_event, next: string) => {
          onDateChange(next);
        }}
        variant="scrollable"
        allowScrollButtonsMobile
        aria-label="Appointment dates"
      >
        {dates.map((date) => (
          <Tab
            key={date.date}
            value={date.date}
            disabled={date.availableCount === 0}
            label={
              <Stack alignItems="center">
                <Typography variant="body2">{date.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {date.availableCount === 0 ? 'None' : `${String(date.availableCount)} free`}
                </Typography>
              </Stack>
            }
            aria-label={`${date.label}, ${
              date.availableCount === 0
                ? 'no times available'
                : pluralize(date.availableCount, 'available time')
            }`}
          />
        ))}
      </Tabs>

      {/* A conflict is the expected outcome of two patients wanting one slot,
          not an error the user caused. */}
      {conflictMessage ? <Alert severity="warning">{conflictMessage}</Alert> : null}

      <Box>
        <FormLabel id="slot-label" sx={{ display: 'block', mb: 1 }}>
          {/* Announced as a count, so a screen-reader user knows the size of
              the choice before stepping through it. */}
          {available.length === 0
            ? 'No times available on this day'
            : pluralize(available.length, 'available time')}
        </FormLabel>

        <RadioGroup
          aria-labelledby="slot-label"
          value={selectedSlotId ?? ''}
          onChange={(event) => {
            onSlotChange(event.target.value as SlotId);
          }}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {daySlots.map((slot) => {
              const disabled = slot.status !== 'available';
              const time = clockLabel(slot.start, undefined, slot.timezone);
              const statusWord =
                slot.status === 'booked'
                  ? 'already booked'
                  : slot.status === 'held'
                    ? 'being booked by someone else'
                    : slot.status === 'expired'
                      ? 'no longer available'
                      : '';

              return (
                <FormControlLabel
                  key={slot.id}
                  value={slot.id}
                  disabled={disabled}
                  control={<Radio sx={{ display: 'none' }} />}
                  sx={{ m: 0 }}
                  label={
                    <Chip
                      label={time}
                      variant={slot.id === selectedSlotId ? 'filled' : 'outlined'}
                      color={slot.id === selectedSlotId ? 'primary' : 'default'}
                      sx={{
                        opacity: disabled ? 0.5 : 1,
                        textDecoration: disabled ? 'line-through' : 'none',
                      }}
                    />
                  }
                  slotProps={{
                    typography: {
                      'aria-label': `${time} ${slot.timezone}${statusWord ? `, ${statusWord}` : ''}`,
                    },
                  }}
                />
              );
            })}
          </Stack>
        </RadioGroup>

        {daySlots.length > 0 ? (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {`Times shown in ${daySlots[0].timezone}`}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}
