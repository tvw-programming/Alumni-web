import sample from './sample.json';
import { TravellerDetailsForm } from './TravellerDetailsForm';

export function TravellerDetailsFormUsage() {
  return (
    <TravellerDetailsForm
      travellers={sample.travellers}
      requiresPassport={sample.requiresPassport}
      // The travel date drives the "valid 6 months after travel" check. The
      // sample has one passport expiring too soon and one missing name, so the
      // field errors are visible on the first Save.
      travelDate={sample.travelDate}
      onSubmit={async (travellers) => {
        const response = await fetch('/api/bookings/travellers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ travellers }),
        });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
