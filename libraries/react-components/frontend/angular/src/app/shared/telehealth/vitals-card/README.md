# VitalsCard

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **Apple Health** | Design | Compact metric tile: label small and uppercase, value dominant, unit subordinate, timestamp at the foot. |
| **Apple Health** | Feature | Relative recency ("2 h ago") rather than a raw timestamp — a vital's usefulness decays with age. |
| **Fitbit** | Design | Inline sparkline sized to the tile, normalised to the series' own range. |
| **Fitbit** | Feature | Trend derived from the series and stated, not left for the reader to infer from a line. |
| **MyChart (Epic)** | Design | Reference range shown as a target beside the reading. |
| **MyChart** | Feature | Abnormal results flagged by the **source system**, never by the client. |
| **Practo / 1mg** | Feature | Reading provenance — device, manual entry or clinic — because a patient-typed number is a different claim from a measured one. |
| **Google Fit** | Design | "Needs attention" carried by an icon and a border weight, not by hue alone. |

## The rule that shapes this component

**The band is never computed here.** Reference ranges vary by age, pregnancy,
comorbidity and laboratory. A tile that decides "140/90 is high" from a
hard-coded constant is practising medicine with a magic number. `band` arrives
from the server; the card renders it — **in words** (`Above range`,
`Needs attention`) as well as colour, because a red tile means nothing to a
colour-blind patient or in a printout.

## Sparkline decisions

- Inline SVG, not a charting library: it is a polyline over a few dozen points.
- Normalised to the series' own min/max, so a flat-looking line means genuinely
  flat rather than "scaled away".
- A constant series would divide by zero — guarded, and drawn down the middle.
- Fewer than two points renders **no** sparkline: one reading is not a
  direction.
- `aria-hidden` with `focusable="false"`, and the trend restated as text in the
  card's `aria-label` — otherwise the information is sighted-only.

## Accessibility

The tile is one `role="group"` with a full-sentence label:
*"Blood pressure: 118/76 mmHg, In range, 2 h ago, Trending down over the last 4
readings"*. The visual fragments are `aria-hidden`, so nothing is announced
twice.

## Usage

```html
<app-vitals-card [vital]="vital" (openHistory)="router.navigate(['/vitals', $event.kind])" />
```
