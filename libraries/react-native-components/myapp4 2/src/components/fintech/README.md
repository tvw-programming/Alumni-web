# Fintech Component Library

Domain layer for payments, cards, verification and lending. Built **on top of**
the base library in `src/components/` — every component here composes
`AppCard`, `AppButton`, `ListItemRow`, `AppSheet`, `StateView`, `FilterChipGroup`,
`StepperIndicator`, `SkeletonLoader` or `StatusBadge` rather than re-implementing them.

## Folder structure

```
src/components/fintech/
├── theme/fintechTokens.ts        # semantic domain tokens (amount.*, status.*, chart.*)
├── types/
│   ├── money.ts                  # Money, formatMoney, precisionFor, masking
│   ├── domain.ts                 # Transaction, Payee, PaymentMethod, AuthState, …
│   └── sample.ts                 # typed loader for the *.sample.json files
├── primitives/Keypad.tsx         # shared by AmountKeypad + PinPad
│
├── BalanceCard/
│   ├── BalanceCard.tsx
│   ├── BalanceCard.sample.json   ← dummy payload
│   ├── BalanceCard.usage.tsx     ← compiling usage example
│   └── index.ts
├── TransactionListItem/          + TransactionGroup.tsx
├── AmountKeypad/                 + amountEntry.ts       (pure entry/validation logic)
├── PinPad/
├── PaymentMethodSelector/
├── CardVisual/                   + CardDetailsPanel.tsx (credential access, separated)
├── PayeeSelector/                + PayeeConfirmation.tsx
├── TransactionStatusSheet/
├── KYCUploader/
├── SpendingCategoryChart/        + DonutChart, BarChart, CategoryLegend, AccessibleDataTable
├── EMICalculator/                + loanEngine.ts        (pure calculation engine)
└── StatementFilterSheet/         + filterState.ts       (serializable filters)
```

Every component folder follows the same three-file shape:
**`Component.tsx`** (the component) · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the Wallet tab in the running app
renders them directly, so an example that breaks fails the typecheck.

## The one rule

> Financial logic, state transitions and sensitive-data handling live **outside**
> these components. They render explicit typed states and emit intent.

Enforced by construction, not convention:

| Component | What it deliberately cannot do |
|---|---|
| `PinPad` | Validate a PIN. The caller verifies; the component renders `AuthState`. |
| `CardVisual` | Accept a full card number. There is no such prop. |
| `CardDetailsPanel` | Reveal anything without an authenticating `onReveal()`. |
| `KYCUploader` | Open a camera. `onCapture` is injected, so no SDK dependency. |
| `PaymentMethodSelector` | Decide availability. `disabledReason` is passed in. |
| `EMICalculator` | Be authoritative. `LoanAdapter` swaps in lender-exact maths. |
| `PermissionPrompt` (base lib) | Depend on a permissions library. `request()` is injected. |

## Cross-cutting standards

**Money.** Integer minor units everywhere, never floats. `formatMoney` derives
precision, symbol placement and negative formatting from `Intl` — including
zero-decimal (JPY) and three-decimal (KWD) currencies.

*Deviation from the brief, on purpose:* minor units are `number`, not `bigint`.
`bigint` survives neither `JSON.parse` nor the RN bridge, and every sample here
is JSON. `number` is exact to 2^53 — ~90 trillion major units — so the precision
argument never bites. The rules that matter (no floats, no arithmetic on
formatted strings) hold. See the note at the top of `types/money.ts`.

**Loading ≠ pending.** `DataState` covers fetching; `TransactionStatus` and
`TransactionResultStatus` cover accepted-but-not-final. `TransactionStatusSheet`
has no single "done" status, so "Payment submitted" can never render as
"Payment completed".

**Never colour alone.** Debit/credit carry a sign and a label. Statuses carry an
icon and a word. Selected states carry a radio, a border and text. Card statuses
get an overlay with a label.

**Charts are hidden from screen readers on purpose.** The SVG is
`accessibilityElementsHidden`; `AccessibleDataTable` carries the same values as a
real table and is a first-class toggle, not a fallback.

**Privacy.** `BalanceCard` re-masks on app background and after a timeout.
`CardDetailsPanel` auto-hides revealed credentials. No component logs a PIN, a
PAN or a document URI.

## Tokens

`design-tokens/fintech.tokens.json` — light and dark, semantic names only:
`amountDebit`, `amountCredit`, `statusPending`, `statusSuccess`, `statusError`,
`borderSelected`, `focusRing`, `privacyMask`, `cardPhysical`/`cardVirtual`/`cardFrozen`,
and a stable 7-colour chart series plus `chartOther`.

Read them with `useFintechTheme()`, the companion to the base `useAppTheme()`.
No component in this folder accepts a hex value.

## Usage

```tsx
import { BalanceCard, TransactionListItem, formatMoney } from '@ui/fintech';

<BalanceCard
  accountName="Everyday account"
  amount={{ minorUnits: 4823150, currency: 'INR' }}
  balanceType="current"
  actions={[{ key: 'send', label: 'Send', icon: 'arrow-top-right', onPress: send }]}
  lastUpdatedAt={lastSync}
/>
```

See the running app's **Wallet** tab for all twelve, or read any
`*.usage.tsx` for the same examples in source form.
