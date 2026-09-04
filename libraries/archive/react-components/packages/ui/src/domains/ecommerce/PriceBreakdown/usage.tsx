import { parseMoney } from '../../../foundation';

import { PriceBreakdown, type PriceLine } from './PriceBreakdown';
import sample from './sample.json';

export function PriceBreakdownUsage() {
  // The server sends the lines already computed. Nothing here adds them up —
  // one place must own how a total is made.
  const lines: PriceLine[] = sample.lines.map((line) => ({
    label: line.label,
    amount: parseMoney(line.amount),
    note: line.note,
  }));

  return (
    <PriceBreakdown lines={lines} total={parseMoney(sample.total)} footnote={sample.footnote} />
  );
}
