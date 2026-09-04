import { BookingTicketCard, type BookingTicket } from './BookingTicketCard';
import sample from './sample.json';

export function BookingTicketCardUsage() {
  const ticket = sample.ticket as BookingTicket;

  return (
    <BookingTicketCard
      ticket={ticket}
      onShowPass={() => {
        // Full-screen, maximum brightness — a gate scanner needs both.
      }}
      onAddToWallet={() => {
        /* hand off the .pkpass */
      }}
    />
  );
}
