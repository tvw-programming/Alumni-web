# Domain theming

How a component in `@idol-ui/react` takes on the identity of its business domain —
a colour, a gradient, a depth treatment, a background, an animated motif — without
any of the 99 components being rewritten, and without breaking the app's existing
light/dark and plain/glass/glass3d theming.

---

## 1. What already exists

The host app owns a complete theme system. Nothing here replaces it.

| Piece | Location | Provides |
| --- | --- | --- |
| Mode | `theme.palette.mode` | `light` \| `dark` |
| Style | `theme.appStyle` | `plain` \| `glass` \| `glass3d` |
| Glass tokens | `theme.glass` | `blur`, `surface`, `surfaceStrong`, `border`, `accentGradient`, `shadow`, `interactive3d`, `hoverShadow` |
| Application | theme factory `MuiPaper` / `MuiCard` / `MuiButton` overrides | glass surfaces and the 3D hover lift, already global |
| Accents | `glassAccents.ts` | four hand-written gradients (violet, pink, teal, amber) |
| Card seam | `GlassCard` | already accepts `accent?: string` and `interactive?: boolean` |

Domain theming is a **fourth axis** on top of mode × style: *which domain is this?*

---

## 2. The constraint that shapes everything

`theme.appStyle` and `theme.glass` are declared by MUI module augmentation **in the
app** (`frontend/react/src/theme/types.ts`). The library is a separate package with
`include: ["src"]`, empty `paths`, and MUI as a *peer* dependency — so it **cannot
see that augmentation**.

Consequence: every read of `appStyle` / `glass` happens in **one adapter**, at
runtime, with a `plain` fallback. The library therefore works unchanged in an app
that has no glass theme at all.

---

## 3. Measured coverage — the number that drives the design

A domain style applied through a scoped CSS boundary reaches a component only if
that component renders a themed surface inside the boundary. Measured across all 99:

| Root element | Count | Reached by `.domain-scope .MuiCard-root`? |
| --- | ---: | --- |
| `Card` / `Paper` / `GlassCard` | 43 | yes, at the root |
| Layout box (`Stack` / `Box`) | 33 | only the 6 that nest a surface |
| List row (`ListItem*`) | 11 | no — needs its own selector |
| Portal (`Dialog` / `Drawer`) | 7 | **no — renders outside the boundary** |
| Other (`TableCell`, `RadioGroup`, `Button`) | 5 | no |

- **49 / 99** render a `Card`/`Paper` somewhere → reachable by a descendant selector.
- **50 / 99** render **no themed surface at all**.
- **22 / 99** render a portal somewhere (menu, dialog, tooltip).

> **React portals render into `document.body`.** They inherit neither a scoped
> class nor CSS custom properties. No boundary-based approach can reach them.

Automatic coverage is **49%**, not 100%. The strategy below is built around that
number rather than around an assumption.

---

## 4. Architecture — four layers

### Layer 0 · Tokens (pure data, no MUI import)

`packages/ui/src/foundation/domainTheme.ts`

```ts
export interface DomainVisualConfig {
  /** Base hue. Everything else is derived from it. */
  readonly hue: string;
  readonly motif: 'bag' | 'chart' | 'pulse' | 'chat' | 'grid'
                | 'board' | 'signal' | 'route' | 'play' | 'ring';
}

export const DOMAIN_VISUALS = {
  ecommerce:     { hue: '#7c63ff', motif: 'bag' },
  fintech:       { hue: '#18c2c2', motif: 'chart' },
  healthcare:    { hue: '#ff5fa2', motif: 'pulse' },
  social:        { hue: '#3b82f6', motif: 'chat' },
  dashboard:     { hue: '#f59e0b', motif: 'grid' },
  collaboration: { hue: '#8b5cf6', motif: 'board' },
  iot:           { hue: '#10b981', motif: 'signal' },
  travel:        { hue: '#0ea5e9', motif: 'route' },
  media:         { hue: '#ef4444', motif: 'play' },
  fitness:       { hue: '#a3e635', motif: 'ring' },
} as const satisfies Record<string, DomainVisualConfig>;

export type DomainId = keyof typeof DOMAIN_VISUALS;
export type MotifId = DomainVisualConfig['motif'];
```

The registry supplies **defaults, not the only path** — a caller may pass its own
`visuals` (see §6).

### Layer 1 · The adapter (the single duck-typing site)

```ts
type AppStyle = 'plain' | 'glass' | 'glass3d';

function resolveAppStyle(theme: unknown): AppStyle {
  const candidate = (theme as { appStyle?: unknown }).appStyle;
  return candidate === 'glass' || candidate === 'glass3d' ? candidate : 'plain';
}
```

Fallback matrix — no cast appears anywhere else in the library:

| Requested | Glass tokens present | Resolves to |
| --- | --- | --- |
| `inherit` | absent | `plain` |
| `inherit` | present | the app's own style |
| `gradientGlass` | absent | `plain` |
| `glass3d` | absent | `plain` |
| `mesh` | absent | **`mesh`** — needs no glass tokens |
| `animated` | absent | **`animated`** — needs no glass tokens |

### Layer 2 · The scope boundary — CSS custom properties, **no nested theme**

The boundary renders one `div`:

```html
<div class="domain-scope" data-appearance="gradientGlass" style="--domain-hue: …">
```

- Values are precomputed with MUI's `alpha()` (**not** `color-mix`) and cached at
  module level, keyed `${domain}:${appearance}:${mode}` — one computation per
  combination, for the life of the process.
- **No theme object is created.** No descendant style recalculation, no subtree
  re-render. The boundary is a `div` with a class, a data attribute and inline vars.
- A nested MUI `ThemeProvider` is created **only** if a component ever needs
  theme-level overrides such as `defaultProps`. Nothing in this plan does. If one
  ever appears it must be `useMemo`'d on `(parentTheme, domain, appearance)` and
  skipped entirely for `inherit` and `plain`.

One `<GlobalStyles>` rule set, mounted **once at app root** — never per boundary:

```css
/* Cards: descendant, so nested surfaces are covered. */
.domain-scope[data-appearance="gradientGlass"] .MuiCard-root { … }

/* Paper: DIRECT CHILD ONLY — keeps menus, popovers and drawers out. */
.domain-scope[data-appearance="gradientGlass"] > .MuiPaper-root { … }

/* List rows: their own selector, since they are not Paper. */
.domain-scope[data-appearance="gradientGlass"] .MuiListItemButton-root { … }
```

`MuiPaper` is **never** styled by descendant selector. That single restriction is
what stops a domain tint leaking into dialogs, menus, drawers and popovers.

### Layer 3 · Explicit props — a short list only

`GlassCard`, `HeroBanner`, `KPIStatCard`. These accept `appearance` directly
because they are the surfaces where an image or an animated motif belongs.

---

## 5. The five appearances

### 5.1 `plain` — colour background and border *(brief item 3)*

Derived from the one hue, so a new domain is one line:

```ts
surface: alpha(hue, mode === 'dark' ? 0.14 : 0.06),
border:  alpha(hue, 0.38),
accent:  hue,                       // 3px leading edge, optional
```

Applied as `background-color` + `border-color`. Text colour is never touched.

### 5.2 `gradientGlass` — gradient glass per domain *(item 4)*

Generalises the four hand-written `glassAccents` to any hue:

```ts
gradient: `linear-gradient(135deg, ${alpha(hue, 0.45)}, ${alpha(hue, 0.08)})`,
```

Composed **over** `theme.glass.surface`, and it adds **no `backdrop-filter`** —
the app's factory already applies blur globally in glass modes, and a second
blurred layer is the usual cause of scroll jank.

### 5.3 `glass3d` — 3D gradient glass per domain *(item 5)*

`gradientGlass`, plus depth:

- a layered shadow tinted with the domain hue, composed with — not replacing —
  `theme.glass.shadow`;
- the factory's existing lift, reused verbatim so the two cannot diverge:
  `translateY(-6px) rotateX(4deg) rotateY(-4deg)`;
- a `::before` specular highlight (soft radial gradient, `pointer-events: none`).

Applied **only to interactive card-like surfaces**. A list row that tilts looks
broken, so `.MuiListItemButton-root` is excluded from this appearance.

### 5.4 `mesh` — lightweight image background *(item 6)*

**No raster images.** Two or three layered `radial-gradient`s in the domain hue:

```ts
backgroundImage: [
  `radial-gradient(at 12% 18%, ${alpha(hue, 0.28)} 0px, transparent 55%)`,
  `radial-gradient(at 86% 12%, ${alpha(hue, 0.18)} 0px, transparent 50%)`,
  `radial-gradient(at 60% 92%, ${alpha(hue, 0.14)} 0px, transparent 45%)`,
].join(', '),
```

Zero bytes, zero requests, no layout shift, correct in dark mode, and it themes
with the hue like everything else. If a real image is ever required: inline SVG
data-URI ≤ 2 KB, `background-size: cover`, always behind a contrast scrim.

### 5.5 `animated` — animated SVG with icon animation *(item 7)*

`<DomainGlyph motif="chart" />` — an inline SVG motif per domain, **CSS keyframes
only**.

- `framer-motion` exists in the app but is **not** a dependency of the package;
  adding an animation library to a peer-dep library for decoration is not worth it.
- Keyframes are defined **once** in the shared `GlobalStyles`, never per instance.
- The glyph is `aria-hidden` — it is decoration; the domain name is already in the
  tree and the labels.
- Everything sits behind `@media (prefers-reduced-motion: reduce)`, which drops the
  animation and the 3D lift together.
- **One glyph per section, hero or summary card.** Never one per row.

---

## 6. The API *(item 8)*

Three levels, so "components don't change" and "local control" are both true —
they are different levels, not the same one.

```tsx
// 1. Subtree default. Sets domain + appearance. Zero component edits.
<DomainThemeProvider domain="fintech" appearance="gradientGlass">
  <BalanceCard />
  <TransactionListItem … />

  {/* 2. Nested override, still zero component edits. */}
  <DomainAppearanceBoundary appearance="mesh">
    <HeroBanner … />
  </DomainAppearanceBoundary>
</DomainThemeProvider>

// 3. Explicit prop — on selected components only.
<GlassCard appearance="glass3d" interactive />
```

Custom domains, without touching the registry:

```tsx
<DomainThemeProvider domain="fintech" visuals={{ hue: '#0066cc', motif: 'chart' }}>
```

```ts
type DomainAppearance =
  | 'inherit'         // follow the app's plain/glass/glass3d — THE DEFAULT
  | 'plain'
  | 'gradientGlass'
  | 'glass3d'
  | 'mesh'
  | 'animated';
```

**The default is `inherit`, so an existing screen renders byte-identically until
someone opts in.**

---

## 7. Coverage strategy per tier

| Tier | Count | Treatment | Component edits |
| --- | ---: | --- | --- |
| A · surface at root | 43 | scoped `.MuiCard-root` selector | none |
| B · surface nested | 6 | same selector, descendant | none |
| C1 · list rows | 11 | `.MuiListItemButton-root` selector | none |
| C2 · no surface | 32 | host wraps in `<DomainSurface>` | none — the gallery does it once |
| D · portals | 7 | **neutral by default** | opt-in only |

**92 / 99 with zero component edits.**

Tier D is a decision, not a gap: a modal is app chrome, not domain content, and
tinting a dialog by whatever happened to open it is noise. The escape hatch is
`slotProps.paper.className`, per component, explicit.

---

## 8. Rollout

1. ~~`DOMAIN_VISUALS`, `DomainId`, `MotifId`, and the pure resolver.~~ **Done.**
2. ~~**Unit tests before any styling lands**: every domain × every appearance ×
   light/dark × **glass tokens absent**.~~ **Done** — 44 tests in
   `domainTheme.test.ts`.
3. ~~Scoped provider and boundary — memoised tokens, CSS variables, one
   `GlobalStyles`.~~ **Done.**
4. ~~**Coverage verification as a test**~~ **Done** — `domainCoverage.test.ts`,
   now classifying through the shared `classifySurface` rather than its own copy
   of the rules, so the test and the gallery cannot disagree.
5. ~~`gradientGlass` → `glass3d` → `mesh`.~~ **Done.** All five appearances are
   in the sheet, offered by the gallery picker, and measured painting in a real
   browser (see below).
6. ~~`DomainGlyph`, on selected components only.~~ **Done differently — see
   below.** The artwork is a background layer, not a component.

### Items 6 and 7: the artwork is real now

`mesh` and `animated` were both `var(--domain-mesh)` — a radial-gradient tint
derived from the hue. Domain-wise, but not an image, and *identical to each
other*: the picker offered two buttons that produced the same pixels, because
the `motif` per domain (`bag`, `chart`, `pulse`, …) was defined, threaded
through the tokens, and consumed by nothing.

`domainMotifs.ts` now draws all ten as inline SVG, inlined into
`--domain-motif` as a `data:` URI and composited over the mesh. A real image
file per domain would mean ten more requests, ten things to cache-bust and a
decode per card; these are ~260–290 bytes each, take the domain's own colour
rather than shipping recoloured copies, and scale to any size.

- **`mesh` → "Image"** — the motif as a static watermark, bottom-right.
- **`animated` → "Image, animated"** — the same artwork drifting, animated on
  `background-position` so the compositor handles it without touching layout,
  and stopped by the same selectors that start it under
  `prefers-reduced-motion`.

Bottom-right, not top-right: a card's header, overflow menu and primary action
all sit along the top edge, and artwork drawn there read as a rendering fault.

It is a background layer rather than the planned `DomainGlyph` component. A
decorative image that lives in the background cannot be selected, cannot take a
tab stop, and is invisible to a screen reader without anyone having to remember
an `aria-hidden` — and it needs no component edits, which is the property the
whole design is built on.

### Icons and sample imagery, per domain

**Icons** come from `@mui/icons-material`, already a peer dependency — a second
icon set for ten pictures would be a dependency nobody asked for. `DOMAIN_VISUALS`
carries an icon id and `DomainIcon` maps it to the import; the id is a closed
union rather than a free string, because a typo would otherwise render nothing
at all with no error. Outlined variants throughout: these sit beside text in a
navigation tree, where filled glyphs read heavier than the label they belong to.
The sidebar's ten branches each showed the same generic `CategoryIcon` before.

**Sample images.** Twelve components loaded photographs from Unsplash. Realistic,
but it made a component gallery depend on a third-party CDN: offline, behind a
proxy, or under any `img-src` policy that does not name that host, a dozen demos
rendered broken images and it looked like the components were at fault.

They are generated now — `sampleImageSvg` draws a domain-coloured gradient with
the domain's own motif over it, in three arrangements so a carousel of five
posters does not show one picture five times. 30 files, 120 KB, written by the
same build script as the catalogue. `preserveAspectRatio="slice"` means one
square drawing fills a poster, a backdrop or an avatar without distortion, so
there is no file per aspect ratio.

They are not photographs and do not pretend to be. The job of a sample image
here is to occupy the right shape in the right colour so the component's layout
can be judged.

Adding the icon field also exposed a bug in `resolveDomainVisuals`: the override
merge listed `hue` and `motif` by hand, so `icon` was dropped the day it was
added. It spreads the base now, and the test asserts on key *count* rather than
on the fields known today — which is what makes it catch the next one.

### The setting is per domain, and it is remembered

Chosen where the domain's components are on screen, in the gallery's picker,
which now names the domain it applies to (`Appearance · E-commerce`).

- **Per domain, not per component.** Picking a variant while looking at one cart
  component holds for all of E-commerce and does not follow you into FinTech.
- **Remembered** in `localStorage`, validated on read — it is user-writable
  storage, and an unknown string would reach the resolver as an appearance it
  cannot resolve.
- **Local to the machine.** It is a viewing preference for the gallery, not
  application data; on the server, one developer's taste for 3D glass would
  become everyone's.
- **The gallery defaults to `Image`** so each domain shows its artwork without
  anyone hunting for a toggle. The *library* still defaults to `inherit`: an app
  embedding these components should look like itself until it asks otherwise.
7. Contrast, reduced-motion, visual regression, large-list performance.
   **Not started** — reduced-motion has a contract test, nothing else.

### What step 5 actually took

The stylesheet was the easy half. Two defects only showed up once a browser
measured a computed style:

- **`DomainSurface` set `border: 1px solid transparent` in a style attribute.**
  Inline styles outrank the sheet, so the scoped `border-color` never applied:
  every wrapped component drew an invisible border while the cards beside it
  showed the domain colour. The width and radius moved into the sheet; only the
  colour is scoped. Regression test asserts the element carries no inline
  border.
- **Both glass appearances degrade to `plain` when the host theme has no glass
  tokens** — the documented fallback, but the picker gave no sign of it, so two
  of its six buttons looked broken. They are now disabled, with a tooltip naming
  the setting that enables them.

### The catalogue moved out of the bundle

Reviewing step 5 for cost turned up something the tests were happy with: the
registry inlined every component's source, README and sample JSON with
`import.meta.glob(..., { eager: true, query: '?raw' })`. That built a 756 KB
chunk — 189 KB gzipped — and because the Master Data sidebar renders the
component tree, **every** Master Data page downloaded it. Manage Product paid
for 99 components' source text to render a product grid.

The index is now generated at `predev`/`prebuild` by
`frontend/react/scripts/build-domain-catalogue.mjs` into
`public/domain-catalogue.json`, and the heavy text sits beside it under
`public/domain-components/`. Both are fetched, so neither is bundled.

| | before | after |
| --- | ---: | ---: |
| Loaded with every Master Data page | 189 KB gzip | **8 KB gzip** |
| Chunks containing component source text | 1 | **0** |
| Catalogue index, fetched once | — | 4 KB gzip |
| Component text, fetched per tab opened | — | 1.8 MB static, on demand |

The script imports `classifySurface` and `summaryOf` from the library itself
rather than reimplementing them — Node strips the types — so the generator and
the coverage test cannot drift apart.

Three things stay in the bundle because they cannot be static files: the domain
tokens, the stylesheet, and the demos. A demo has to be a module the bundler
links, so `ComponentDemo` renders it from a map of `lazy()` wrappers built once
at module load. It is a component rather than a `demoFor(id)` accessor because
handing a component *type* back to a caller makes every call site look like it
is creating a component during render — which the compiler lint rejects, and
which would remount the demo on each render.

Tier C2 is covered the way §7 says: the gallery reads `entry.surfaceTier` and
wraps only the `no-surface` entries. Wrapping the rest would tint a box around
an already-tinted card, which is asserted against directly.

Measured in Chrome, ecommerce (`#7c63ff`), light mode:

| Appearance | Background | Border |
| --- | --- | --- |
| `plain` | `rgba(124, 99, 255, 0.06)` | `rgba(124, 99, 255, 0.38)` |
| `gradientGlass` | `linear-gradient(135deg, rgba(124, 99, 255, …))` | same |
| `glass3d` | same gradient, plus shadow and lift | same |
| `mesh` | `radial-gradient(at 12% 18%, …)` | same |
| `animated` | same mesh, plus drift | same |

Identical values on a wrapped `no-surface` component and on a component that
renders its own `Card` — which is the whole point of the tier split.

---

## 9. Guardrails

- Tint **backgrounds only** — never text. Verify 4.5:1 against the theme's text
  colour in both modes.
- **No second `backdrop-filter`** over the theme's existing glass layer.
- Compose with the factory's transforms and shadows; do not replace them.
- 3D transforms only on interactive card-like surfaces.
- No `will-change` on cards.
- Shared keyframes; no per-instance keyframe generation.
- The provider sits **above** lists, never inside a row.
- **The boundary never touches `document.body`** — two domains must be able to
  coexist on one screen.
- Domain colour stays decorative. Nothing is communicated by hue alone.

---

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| Portals escape the boundary | 7 components neutral by default; documented, with an opt-in class |
| `MuiPaper` over-reach | direct-child selector only; never descendant |
| Theme recreation cost | no nested theme in the default path; vars cached per `(domain, appearance, mode)` |
| Coverage drift as components are added | step 4 makes coverage a failing test, not a spot-check |
| Glass tokens absent (library reused elsewhere) | single adapter, `plain` fallback, `mesh`/`animated` still work |
| Contrast regressions in dark mode | per-appearance contrast assertions in step 7 |
