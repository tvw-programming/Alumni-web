import { parseMoney } from '../../../foundation';

import { HotelCard, type Hotel } from './HotelCard';
import sample from './sample.json';

export function HotelCardUsage() {
  const hotel: Hotel = {
    ...(sample.hotel as unknown as Hotel),
    nightlyPrice: parseMoney(sample.hotel.nightlyPrice),
    totalPrice: parseMoney(sample.hotel.totalPrice),
  };

  return (
    <HotelCard
      hotel={hotel}
      onSelect={() => {
        /* open room selection */
      }}
    />
  );
}
