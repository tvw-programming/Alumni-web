import { parseMoney } from '../../../foundation';

import { FareBreakdown } from './FareBreakdown';
import sample from './sample.json';

import type { PriceLine } from '../../ecommerce/PriceBreakdown/PriceBreakdown';

export function FareBreakdownUsage() {
  const lines: PriceLine[] = sample.lines.map((line) => ({
    label: line.label,
    amount: parseMoney(line.amount),
    note: line.note,
  }));

  return (
    <FareBreakdown
      lines={lines}
      total={parseMoney(sample.total)}
      // Set by the caller when the reprice call returns a different total. The
      // user sees both numbers rather than being quietly charged the new one.
      previousTotal={parseMoney(sample.previousTotal)}
      cancellationPolicy={sample.cancellationPolicy}
      footnote={sample.footnote}
    />
  );
}
