# @idol-ui/react

Reusable React 19 + MUI component library for Idol applications.

## Structure

```
src/
├── domains/           99 components in 10 domains
│   ├── ecommerce/     ProductCard, CartLineItem, CouponInput, …
│   ├── fintech/       BalanceCard, PinPad, PaymentConfirmation, …
│   ├── healthcare/    AppointmentSlotGrid, VitalsCard, ConsentDialog, …
│   ├── social/        PostCard, ChatBubble, MentionTextInput, …
│   ├── dashboard/     DataTableWrapper, KPIStatCard, ExportSheet, …
│   ├── collaboration/ TaskListItem, KanbanColumn, ApprovalRequestCard, …
│   ├── iot/           DeviceCard, ThermostatDial, DevicePairingWizard, …
│   ├── travel/        SearchWidget, FlightResultCard, RideStatusBottomSheet, …
│   ├── media/         HeroBanner, PlayerControlsOverlay, DownloadStatusButton, …
│   └── fitness/       WorkoutCard, ActivityRings, MeditationPlayerCard, …
├── foundation/        money, branded ids, mutation contracts, React 19 hooks
├── registry.ts        auto-discovers folders; no list to maintain
└── index.ts           barrel export for consumers
```

## Usage

```tsx
import { ProductCard } from '@idol-ui/react/domains/ecommerce/ProductCard';
import { formatMoney } from '@idol-ui/react/foundation';
```

## Adding a Component

1. Create a folder under `src/domains/<domain>/<ComponentName>/`
2. Add the four conventional files:
   - `<ComponentName>.tsx` — the component
   - `sample.json` — realistic data
   - `usage.tsx` — wiring, exporting `<ComponentName>Usage`
   - `README.md` — API docs
3. Run `pnpm typecheck` — it now appears in the gallery.
