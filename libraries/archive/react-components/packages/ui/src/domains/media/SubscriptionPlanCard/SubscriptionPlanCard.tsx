import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, formatMoney, useAction, type Money } from '../../../foundation';

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: Money;
  /** "month" or "year". Always shown next to the price. */
  billingPeriod: string;
  videoQuality: string;
  deviceCount: number;
  downloadsAllowed: number | 'unlimited' | 'none';
  hasAds: boolean;
  features: PlanFeature[];
  current?: boolean;
  recommended?: boolean;
}

export interface SubscriptionPlanCardProps {
  plan: SubscriptionPlan;
  /** Wording differs for an upgrade, a downgrade and a first purchase. */
  changeLabel?: string;
  onChoose: () => Promise<void>;
}

/**
 * One plan in a comparison.
 *
 * Price **and** billing period together, always. "₹649" without "per month" is
 * the oldest dark pattern in subscriptions.
 *
 * Ads, quality, device count and downloads are explicit rows rather than
 * marketing bullets, because those four are what people actually compare and
 * what they complain about after the fact.
 */
export function SubscriptionPlanCard({ plan, changeLabel, onChoose }: SubscriptionPlanCardProps) {
  const [result, choose, pending] = useAction<void, 'chosen'>(async () => {
    await onChoose();
    return 'chosen';
  });

  const downloads =
    plan.downloadsAllowed === 'none'
      ? 'No downloads'
      : plan.downloadsAllowed === 'unlimited'
        ? 'Unlimited downloads'
        : `${String(plan.downloadsAllowed)} downloads`;

  const facts = [
    plan.hasAds ? 'With ads' : 'No ads',
    plan.videoQuality,
    `${String(plan.deviceCount)} device${plan.deviceCount === 1 ? '' : 's'} at once`,
    downloads,
  ];

  return (
    <Card
      variant="outlined"
      sx={{
        width: 260,
        flexShrink: 0,
        borderColor: plan.current === true ? 'primary.main' : 'divider',
        borderWidth: plan.current === true ? 2 : 1,
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1" fontWeight={700}>
            {plan.name}
          </Typography>
          {plan.current === true ? <Chip size="small" color="primary" label="Current" /> : null}
          {plan.recommended === true && plan.current !== true ? (
            <Chip size="small" variant="outlined" label="Recommended" />
          ) : null}
        </Stack>

        {/* Price and period together, always. */}
        <Stack direction="row" spacing={0.5} alignItems="baseline" sx={{ mt: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {formatMoney(plan.price)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {`per ${plan.billingPeriod}`}
          </Typography>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Stack spacing={0.5} aria-label={describe(plan.name, ...facts)}>
          {facts.map((fact) => (
            <Typography key={fact} variant="body2" aria-hidden>
              {fact}
            </Typography>
          ))}
        </Stack>

        {plan.features.length > 0 ? (
          <Stack spacing={0.25} sx={{ mt: 1.5 }}>
            {plan.features.map((feature) => (
              <Stack
                key={feature.label}
                direction="row"
                spacing={0.75}
                alignItems="center"
                aria-label={`${feature.label}: ${feature.included ? 'included' : 'not included'}`}
              >
                {feature.included ? (
                  <CheckIcon fontSize="small" color="success" aria-hidden />
                ) : (
                  <CloseIcon fontSize="small" color="disabled" aria-hidden />
                )}
                <Typography
                  variant="caption"
                  color={feature.included ? 'text.primary' : 'text.disabled'}
                  aria-hidden
                >
                  {feature.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : null}

        {result.status === 'error' ? (
          <Typography
            variant="caption"
            color="error.main"
            role="alert"
            sx={{ mt: 1, display: 'block' }}
          >
            {result.message}
          </Typography>
        ) : null}

        <Button
          fullWidth
          variant={plan.current === true ? 'outlined' : 'contained'}
          disabled={plan.current === true || pending}
          sx={{ mt: 2 }}
          onClick={() => {
            choose();
          }}
          aria-label={`${changeLabel ?? 'Choose'} ${plan.name}, ${formatMoney(plan.price)} per ${plan.billingPeriod}`}
        >
          {plan.current === true ? 'Your plan' : pending ? 'Working…' : (changeLabel ?? 'Choose')}
        </Button>
      </CardContent>
    </Card>
  );
}
