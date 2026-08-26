import { useState } from 'react';

import { parseMoney } from '../../../foundation';

import { AmountKeypad } from './AmountKeypad';
import sample from './sample.json';

export function AmountKeypadUsage() {
  // Minor units as a string: ₹1,250.00 is "125000". No float exists at any
  // point between the keypad and the payment request.
  const [value, setValue] = useState(sample.value);

  return (
    <AmountKeypad
      value={value}
      currency={sample.currency}
      min={parseMoney(sample.min)}
      max={parseMoney(sample.max)}
      helperText={sample.helperText}
      onChange={setValue}
    />
  );
}
