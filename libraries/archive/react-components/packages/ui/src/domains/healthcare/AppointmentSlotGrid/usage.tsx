import { useState } from 'react';

import { asId, type SlotId } from '../../../foundation';

import { AppointmentSlotGrid, type AppointmentSlot } from './AppointmentSlotGrid';
import sample from './sample.json';

export function AppointmentSlotGridUsage() {
  const [date, setDate] = useState(sample.selectedDate);
  const [slotId, setSlotId] = useState<SlotId | undefined>(asId<SlotId>(sample.selectedSlotId));

  return (
    <AppointmentSlotGrid
      dates={sample.dates}
      slots={sample.slots as unknown as Record<string, AppointmentSlot[]>}
      selectedDate={date}
      selectedSlotId={slotId}
      onDateChange={(next) => {
        setDate(next);
        // Clearing the slot is the point: slot ids are per-day, and keeping one
        // across a date change books the wrong appointment.
        setSlotId(undefined);
      }}
      onSlotChange={setSlotId}
    />
  );
}
