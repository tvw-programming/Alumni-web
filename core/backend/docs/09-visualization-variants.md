# Visualisation variants

The dashboard's **Visual** view draws the 24 steps either as a plain card each —
the shipped default — or as a domain metaphor: a freight convoy, a ledger line,
an assembly line. Which drawing, and in what colours, is configuration rather
than code: the orchestrator serves whatever `config.json` declares, and the
dashboard renders it.

The default variant is `precision`, which draws the plain card. The freight
convoy that used to be the default is still there under `logistics`; setting
`visualization.default_variant` to `"logistics"` brings it back, with nothing
else to change.

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
| `vehicle` | no | What to draw per step: `card` for the plain card, anything else for the truck silhouette. Defaults to `truck`. |
| `motion` | no | Motion hint for the flow between steps. Defaults to `speed-route`. |
| `palette` | yes | The colours below. |
| `card` | no | The card's shell and its state treatment, below. Every key defaults, so the block can be omitted entirely or set one key deep. Ignored unless `vehicle` is `card`. |

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

`card` and `truck` are the two drawings. An unknown `vehicle` falls back to the
truck, so a copied block always renders — the palette, labels and headline still
apply.

## `card`

Only read when `vehicle` is `card`. The defaults are a deliberate specification,
not arbitrary numbers: a surface reads as confident when it signals precision,
stability and a single authority. One hairline stroke rather than a thick frame,
near-sharp corners rather than a pill, an opaque ground rather than glass, and
depth from a single 8% layer beneath — never a stack of offset rectangles, which
reads as a deck mid-shuffle rather than a system under control. The several
processes inside a step are drawn *within* the card as micro indicators.

| Key | Default | Meaning |
| --- | --- | --- |
| `border_width` | `1px` | Thin implies precision engineering; a thick border looks like a frame holding something together. |
| `border_style` | `solid` | |
| `border_color` | `""` | Empty takes the step's status colour, dimmed. A literal colour overrides it for every status. |
| `radius` | `3px` | Near-sharp. Large radii read as approachable; 2–4px reads as exact. |
| `background` | `""` | Empty takes the variant's surface for that status. Always opaque — a ground that shows through reads as unfinished. |
| `shadow` | `1px 1px 0 rgba(0,0,0,0.04)` | Nearly invisible: depth, not drama. |
| `hover_shadow` | `2px 2px 0 rgba(0,0,0,0.10)` | |
| `depth_layer` | `true` | The single offset layer beneath the card. |
| `depth_offset` | `2px` | Down and right. |
| `depth_opacity` | `0.08` | |
| `accent_edge` | `left` | Where the status stripe sits: `left`, `top` or `none`. |
| `accent_width` | `2px` | |
| `indicator` | `bars` | How the step's tasks are drawn inside the card: `bars`, `dots` or `none`. |

### State treatment

A 24-step run is mostly settled history and unstarted future with one or two
steps actually working, so the states are *weighted* rather than merely tinted.
Weight comes from contrast and motion — never from a thicker border, which would
undo the point of the shell.

| Key | Default | Meaning |
| --- | --- | --- |
| `active_accent_width` | `3px` | The running step's stripe, wider than the rest so the eye lands on it. Also used by the two states that need a person. |
| `active_animation` | `scan` | `scan` runs a highlight along the stripe, `pulse` fades it, `none` stops it. `prefers-reduced-motion` stops all three. |
| `active_animation_ms` | `1800` | |
| `active_shadow` | `""` | Empty draws a ring in the status colour, lifting the running card off the route. |
| `completed_opacity` | `0.86` | Settled work stays legible without competing with the live step. |
| `upcoming_opacity` | `0.5` | |
| `upcoming_border_style` | `dashed` | Not started: present in the plan, plainly not underway. |

Only the running step animates. Awaiting-a-human and failed steps take the same
weight without the motion — nothing is progressing there, and a card that
animates while stuck says the opposite of what is true.
