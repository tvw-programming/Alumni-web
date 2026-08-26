# BalanceCard

An account balance, masked by default.

## API

```ts
type BalanceCardProps = {
  accountName: string;
  balance: Money;
  availableBalance?: Money;
  visibility: 'masked' | 'visible';
  status: 'ready' | 'loading' | 'offline' | 'error' | 'locked';
  updatedAt?: string;
  onToggleVisibility: () => void;
  onPress?: () => void;
  onRefresh?: () => Promise<void>;
  autoMaskAfterMinutes?: number; // default 2, 0 disables
};
```

## React 19

`useActionState` for refresh. **Never `useOptimistic` for the balance** — a
predicted balance is a wrong balance, and it is the one number a banking app may
not get wrong. Optimistic UI is fine for visual preferences here, not for money.

## Re-masking

The card re-masks when the tab is hidden and after an idle timeout. Shoulder
surfing is the actual threat model for a balance on a phone in public, and a
balance left visible on a backgrounded app is the common way it happens.

## State matrix

| Status  | Chip                                   |
| ------- | -------------------------------------- |
| ready   | "Up to date"                           |
| loading | "Updating"                             |
| offline | "Offline — showing last known balance" |
| error   | "Could not update"                     |
| locked  | "Account locked", refresh disabled     |

## Accessibility

- Masked bullets announce as "bullet bullet bullet". The label instead says
  _"Balance hidden for Everyday Savings"_.
- Visible: _"Balance, 24,000 rupees"_, _"Available balance, 23,125 rupees"_.
- The toggle carries `aria-pressed` and swaps between "Show balance" and "Hide
  balance".
- "Last updated 2 hours ago (6 Aug 2026, 10:42)" — relative _and_ absolute.
