import { parseMoney } from '../../../foundation';

import { FlightResultCard, type FlightOffer } from './FlightResultCard';
import sample from './sample.json';

export function FlightResultCardUsage() {
  const offer: FlightOffer = {
    ...(sample.offer as unknown as FlightOffer),
    price: parseMoney(sample.offer.price),
  };

  return (
    <FlightResultCard
      offer={offer}
      onSelect={() => {
        /* go to fare selection */
      }}
    />
  );
}
