import { useState } from 'react';

import { parseMoney } from '../../../foundation';

import sample from './sample.json';
import { SlotBookingCalendar, type CalendarDay } from './SlotBookingCalendar';

export function SlotBookingCalendarUsage() {
  const [selected, setSelected] = useState(sample.selectedDate);

  const days: CalendarDay[] = sample.days.map((day) => ({
    date: day.date,
    available: day.available,
    cheapest: day.cheapest,
    price: day.price ? parseMoney(day.price) : undefined,
  }));

  return (
    <SlotBookingCalendar
      monthLabel={sample.monthLabel}
      days={days}
      selectedDate={selected}
      canGoBack={sample.canGoBack}
      onMonthChange={() => {
        /* refetch the month */
      }}
      onSelect={setSelected}
    />
  );
}
