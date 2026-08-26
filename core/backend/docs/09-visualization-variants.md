# Visualisation variants

The dashboard's **Visual** view draws the 24 steps as a domain metaphor — a
freight convoy, a ledger line, an assembly line. Which metaphor, and in what
colours, is configuration rather than code: the orchestrator serves whatever
`config.json` declares, and the dashboard renders it.

Ready-made blocks for eight domains live in
[`config/samples/visualization.variants.sample.json`](../config/samples/visualization.variants.sample.json).

## Adding a variant

The sample file has the same shape as `config.json`, so adding a domain is a
copy, not an edit:

1. Open the sample and find the variant you want under `visualization.variants`.
2. Copy that block — the key and its object, e.g. `"banking": { … }` — into
   `visualization.variants` in `config/config.json`.
3. Set `visualization.default_variant` to the same key if it should be the one
   the dashboard opens with.
4. Run `codegen-core config validate`. Every field is typed, so a typo fails here
   rather than in the browser.

No block needs modification after copying. They are complete and independent;
several can coexist and `default_variant` picks between them.

## Fields

| Field | Required | Meaning |
| --- | --- | --- |
| `label` | yes | Display name, e.g. `Logistics`. Used in the view's description. |
| `kicker` | no | Small mono line above the heading. Conventionally uppercase. |
| `headline` | no | The heading shown while the Visual view is open. |
| `route_label` | no | Caption above the route strip, e.g. `FREIGHT ROUTE`. |
| `vehicle` | no | Which silhouette to draw per step. Defaults to `truck`. |
| `motion` | no | Motion hint for the flow between steps. Defaults to `speed-route`. |
| `palette` | yes | The colours below. |

### `palette`

All ten colours are required and must be hex; `pattern` is optional CSS used as
the route's background texture.

| Key | Used for |
| --- | --- |
| `accent` | Kicker, focus rings, the variant's identity colour |
| `accent_bright` | The step currently running; the running dash in the flow |
| `accent_soft` | Fills inside the silhouette, e.g. a cab window |
| `secondary` | Directional details — arrows, trim |
| `completed` | Steps the run has cleared, and the lit corridor behind them |
| `muted` | Steps not yet started |
| `surface` | Route background |
| `surface_active` | Fill of the running step |
| `surface_completed` | Fill of a cleared step |
| `surface_upcoming` | Fill of a step not yet started |
| `pattern` | CSS background image tiled behind the route |

## What the palette does not control

Two states deliberately ignore the variant and keep the dashboard's own colours:
a step **awaiting a human** stays amber and a **failed** step stays rose. A
reviewer learns one colour for "you are needed"; it should not change because
the drawing did.

Only `truck` is drawn today. An unknown `vehicle` falls back to it, so a copied
block always renders — the palette, labels and headline still apply.
