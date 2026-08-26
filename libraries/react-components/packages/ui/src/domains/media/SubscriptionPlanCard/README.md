# SubscriptionPlanCard

## API

```ts
type SubscriptionPlanCardProps = {
  plan: SubscriptionPlan; // price, billingPeriod, videoQuality, deviceCount, downloadsAllowed, hasAds, features
  changeLabel?: string; // "Upgrade" / "Downgrade" / "Choose"
  onChoose: () => Promise<void>;
};
```

## Price and period together, always

"₹649" without "per month" is the oldest dark pattern in subscriptions. The type
makes `billingPeriod` required so a card cannot render the price alone.

## Four facts, not marketing bullets

Ads, quality, simultaneous devices, downloads — rendered as plain rows because
those four are what people compare, and what they complain about afterwards.
`hasAds` renders as "With ads" or "No ads"; there is no way to omit it.

## React 19

`useActionState`. Entitlement is validated server-side and the billing SDK owns
the purchase — React 19 replaces neither.

## Accessibility

Each feature announces _"Dolby Atmos: not included"_ — a grey tick and a grey
cross are the same glyph to a screen reader. The button repeats the plan and
price, since a row of cards otherwise offers three buttons called "Choose".
