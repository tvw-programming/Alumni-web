import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatMoney, type Money } from '../../../foundation';

export interface CalendarDay {
  date: string;
  /** Cheapest price that day, if any. */
  price?: Money;
  available: boolean;
  /** Flagged for the "cheapest in this month" hint. */
  cheapest?: boolean;
}

export interface SlotBookingCalendarProps {
  monthLabel: string;
  days: CalendarDay[];
  selectedDate?: string;
  canGoBack?: boolean;
  onMonthChange: (direction: -1 | 1) => void;
  onSelect: (date: string) => void;
}

/**
 * A month grid with prices.
 *
 * Prices in the calendar are the point: choosing a date without them means
 * clicking through five days to discover the cheap one. The "cheapest" flag is
 * server-computed — a client that decides which day is cheapest from the days it
 * happens to have loaded will be wrong at a month boundary.
 *
 * Grid semantics: `role="grid"` with a `gridcell` per day, so a screen reader
 * announces it as a table and arrow keys mean something.
 */
export function SlotBookingCalendar({
  monthLabel,
  days,
  selectedDate,
  canGoBack = true,
  onMonthChange,
  onSelect,
}: SlotBookingCalendarProps) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <IconButton
          size="small"
          aria-label="Previous month"
          disabled={!canGoBack}
          onClick={() => {
            onMonthChange(-1);
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="subtitle2" fontWeight={700} role="status">
          {monthLabel}
        </Typography>
        <IconButton
          size="small"
          aria-label="Next month"
          onClick={() => {
            onMonthChange(1);
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      <Box
        role="grid"
        aria-label={`Dates in ${monthLabel}`}
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}
      >
        {days.map((day) => {
          const selected = day.date === selectedDate;
          const dayNumber = Number(day.date.slice(-2));

          return (
            <Box
              key={day.date}
              role="gridcell"
              component="button"
              type="button"
              disabled={!day.available}
              aria-selected={selected}
              aria-label={`${day.date}${
                day.available
                  ? day.price
                    ? `, from ${formatMoney(day.price)}${day.cheapest === true ? ', cheapest this month' : ''}`
                    : ', available'
                  : ', not available'
              }`}
              onClick={() => {
                onSelect(day.date);
              }}
              sx={{
                p: 0.5,
                minHeight: 52,
                border: 1,
                borderRadius: 1,
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? 'primary.main' : 'transparent',
                color: selected ? 'primary.contrastText' : 'text.primary',
                opacity: day.available ? 1 : 0.4,
                cursor: day.available ? 'pointer' : 'not-allowed',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
              }}
            >
              <Typography variant="caption" fontWeight={600} aria-hidden>
                {dayNumber}
              </Typography>
              {day.price ? (
                <Typography
                  variant="caption"
                  aria-hidden
                  sx={{
                    fontSize: 10,
                    color: selected
                      ? 'inherit'
                      : day.cheapest === true
                        ? 'success.main'
                        : 'text.secondary',
                    fontWeight: day.cheapest === true ? 700 : 400,
                  }}
                >
                  {formatMoney(day.price).replace(/\.00$/, '')}
                </Typography>
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
