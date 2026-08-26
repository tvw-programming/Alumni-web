# SlotBookingCalendar

A month grid with prices.

## API

```ts
type SlotBookingCalendarProps = {
  monthLabel: string;
  days: CalendarDay[]; // { date, price?, available, cheapest? }
  selectedDate?: string;
  canGoBack?: boolean;
  onMonthChange: (direction: -1 | 1) => void;
  onSelect: (date: string) => void;
};
```

## Prices in the grid

Choosing a date without them means clicking through five days to discover the
cheap one.

`cheapest` is **server-computed**. A client that decides which day is cheapest
from the days it happens to have loaded will be wrong at a month boundary.

## Accessibility

`role="grid"` with a `gridcell` per day, so a screen reader announces a table
rather than thirty buttons. Each cell says _"2026-09-03, from ₹3,899, cheapest
this month"_ or _"…, not available"_ — the price is in the label, not only in
tiny green text.

`canGoBack={false}` disables the past rather than letting the user navigate to
months they cannot book.
