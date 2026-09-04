import { useState } from 'react';

import { parseMoney, useAction, type Money } from '../../../foundation';

import { CouponInput, type CouponState } from './CouponInput';
import sample from './sample.json';

interface CouponOutcome {
  state: CouponState;
  message: string;
  discount?: Money;
}

export function CouponInputUsage() {
  const [code, setCode] = useState(sample.value);

  // The Action lives with the parent because an applied coupon changes the cart
  // totals, which live above the input.
  const [result, apply, pending] = useAction<string, CouponOutcome>(async (_previous, next) => {
    const response = await fetch('/api/cart/coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: next }),
    });
    const body = (await response.json()) as { message: string; discount?: typeof sample.discount };

    if (!response.ok) {
      // A specific reason, from the server. "Invalid code" tells the user
      // nothing they can act on.
      return { status: 'error', message: body.message, code: 'COUPON_REJECTED' };
    }
    return {
      state: 'applied',
      message: body.message,
      discount: body.discount ? parseMoney(body.discount) : undefined,
    };
  });

  const state: CouponState = pending
    ? 'validating'
    : result.status === 'success'
      ? result.data.state
      : result.status === 'error'
        ? 'invalid'
        : 'idle';

  const message =
    result.status === 'success'
      ? result.data.message
      : result.status === 'error'
        ? result.message
        : undefined;

  return (
    <CouponInput
      value={code}
      state={state}
      message={message}
      discount={result.status === 'success' ? result.data.discount : undefined}
      // The code survives a failure — it is never cleared here.
      onChange={setCode}
      // `apply` dispatches; the Action does the awaiting, which is why there
      // is nothing to await here.
      onApply={() => {
        apply(code.trim().toUpperCase());
        return Promise.resolve();
      }}
      onRemove={async () => {
        await fetch('/api/cart/coupon', { method: 'DELETE' });
        setCode('');
      }}
    />
  );
}
