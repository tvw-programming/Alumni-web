import Stack from '@mui/material/Stack';

import { parseMoney } from '../../../foundation';

import sample from './sample.json';
import { SubscriptionPlanCard, type SubscriptionPlan } from './SubscriptionPlanCard';

export function SubscriptionPlanCardUsage() {
  const plans: SubscriptionPlan[] = sample.plans.map((plan) => ({
    ...(plan as unknown as SubscriptionPlan),
    price: parseMoney(plan.price),
  }));

  return (
    <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
      {plans.map((plan) => (
        <SubscriptionPlanCard
          key={plan.id}
          plan={plan}
          changeLabel={plan.recommended === true ? 'Upgrade' : 'Choose'}
          // Entitlement is validated server-side; the billing SDK owns the
          // purchase itself. React 19 does not replace either.
          onChoose={async () => {
            const response = await fetch('/api/subscription', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planId: plan.id }),
            });
            if (!response.ok) throw await response.json();
          }}
        />
      ))}
    </Stack>
  );
}
