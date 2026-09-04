import List from '@mui/material/List';

import { MedicationReminderItem, type MedicationDose } from './MedicationReminderItem';
import sample from './sample.json';

export function MedicationReminderItemUsage() {
  const dose = sample.dose as MedicationDose;

  return (
    <List disablePadding>
      <MedicationReminderItem
        dose={dose}
        // Resolves only when the adherence record is stored. The tick must not
        // appear before that: this is clinical evidence, not a checkbox.
        onMarkTaken={async () => {
          const response = await fetch(`/api/medications/doses/${dose.id}/taken`, {
            method: 'POST',
          });
          if (!response.ok) throw await response.json();
        }}
        onSkip={async (reason) => {
          await fetch(`/api/medications/doses/${dose.id}/skipped`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
          });
        }}
      />
    </List>
  );
}
