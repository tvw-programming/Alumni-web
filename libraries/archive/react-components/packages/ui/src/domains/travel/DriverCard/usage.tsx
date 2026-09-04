import { DriverCard } from './DriverCard';
import sample from './sample.json';

export function DriverCardUsage() {
  return (
    <DriverCard
      driver={sample.driver}
      // Both go through a masking proxy. The driver's real number never reaches
      // the client, and neither does the rider's.
      onCall={() => {
        window.location.href = 'tel:+18005550100';
      }}
      onMessage={() => {
        /* open the masked chat thread */
      }}
    />
  );
}
