import sample from './sample.json';
import { SensorReadingCard, type SensorReading } from './SensorReadingCard';

export function SensorReadingCardUsage() {
  const reading = sample.reading as SensorReading;
  // `now` is injected so the stale state is demonstrable and testable without
  // waiting half an hour.
  const now = new Date(new Date(reading.measuredAt).getTime() + 3 * 60 * 60 * 1000);

  return <SensorReadingCard reading={reading} now={now} />;
}
