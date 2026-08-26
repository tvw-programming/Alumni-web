import { EmergencyContactCard } from './EmergencyContactCard';
import sample from './sample.json';

export function EmergencyContactCardUsage() {
  return (
    <EmergencyContactCard
      // From the user's region, never hard-coded: 112, 999, 911, 108 and 000
      // are each correct somewhere.
      emergencyNumber={sample.emergencyNumber}
      emergencyLabel={sample.emergencyLabel}
      medicalNotes={sample.medicalNotes}
      contacts={sample.contacts}
      onCall={(phone) => {
        window.location.href = `tel:${phone}`;
      }}
    />
  );
}
