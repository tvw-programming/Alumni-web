# GenericCard

`GenericCard` is a presentation-only MUI card shell. Parents own data fetching,
business actions, and coordination between cards; the component owns reusable
visual states and optional window behavior.

```tsx
<GenericCard
  header={{
    title: 'Revenue',
    subtitle: 'This month',
    badge: <Chip label="On target" />,
    metric: '₹42,000',
  }}
  state={{ loading, error, empty }}
  appearance={{ surface: 'glass', hoverAnimation: true }}
  windowControls={{ minimizable: true, fullscreenable: true, resizable: true }}
  slots={{
    body: <RevenueChart />,
    footer: <Button onClick={openReport}>Open report</Button>,
  }}
/>
```

Use `children` for a simple body or `slots` for complete header/body/footer and
state composition. Controlled `minimized` and `fullScreen` values are available
when a parent needs to coordinate multiple cards; otherwise the component can
manage those two UI states internally.

The card never moves on hover by default, including under the glass themes that
animate `MuiCard` globally. Set `appearance.hoverAnimation: true` to opt into
the lift-and-shadow motion.

## Memoization

The component holds no `useMemo`, `useCallback`, or `React.memo` on purpose.

Measured with the React Profiler (40 cards, 20 updates, interleaved rounds with
warm-up discarded, jsdom):

| Variant                                      | Median update           |
| -------------------------------------------- | ----------------------- |
| As shipped                                   | 8.37 ms (~0.21 ms/card) |
| Wrapped in `React.memo`                      | 8.12 ms                 |
| `React.memo` + stable props at the call site | 0 renders               |

`React.memo` on its own buys nothing: the props are grouped config objects
(`header`, `appearance`, `slots`) plus `children`, and every call site builds
them inline, so the shallow compare never bails out and only adds cost. The
third row is the real lever, and it belongs to the caller — hoist or memoize the
config objects — not to this file.

Memoizing `buildCardSx` was also measured and rejected: MUI re-runs
`styleFunctionSx` on every render regardless of `sx` identity, so a stable
reference changed nothing (0.90 ms vs 0.84 ms median for 40 MUI `Card`s).

Re-measure before adding any of this back.
