# Component screenshot capture

Generates one screenshot per component across every domain in
`src/components/` and writes them to `/screenshots/<domain>-<Component>.jpg`
at the repo root (e.g. `screenshots/agritech-ShipmentCard.jpg`).

## How it works

1. **`generate-screenshot-registry.js`** scans each domain folder for
   component subfolders (any folder with an `index.ts` + `*.usage.tsx` pair
   — the same shape every domain in this library already uses) and writes:
   - `src/screenshotHarness/registry.generated.tsx` — imports every
     `<Component>Usage` export and maps it to a `"<domain>-<Component>"` key.
   - `scripts/screenshots-manifest.json` — the same keys as plain JSON, so
     the capture script doesn't need to parse TypeScript.
2. **`src/screenshotHarness/HarnessApp.tsx`** is a second, minimal root
   component (the real app's `App.tsx` is untouched) that reads
   `?shot=<domain>-<Component>` from the URL and renders exactly that
   component's own `*.usage.tsx` example — the same one already rendered
   live by that domain's gallery screen — wrapped in the same provider
   stack (`AppThemeProvider`, `SafeAreaProvider`, toast/sheet/confirm
   providers, …) so nothing crashes on a missing context. It mounts instead
   of the real app only when `EXPO_PUBLIC_SCREENSHOT_HARNESS=1` (set by
   `capture-screenshots.js`); normal `expo start` / production builds are
   unaffected.
3. **`ScreenshotErrorBoundary.tsx`** wraps each rendered component. A
   handful of components in this library depend on native-only modules
   with no web implementation (a hardware slider, a camera scanner
   overlay); rather than let one such component crash the entire capture
   run, the boundary swaps in a small labeled placeholder image
   ("Render failed — <key>") so every component still produces a file, and
   the failure is called out by name in the run's summary.
4. **`capture-screenshots.js`** is the entry point:
   - regenerates the registry,
   - runs `expo export --platform web` once with the harness active,
     producing a static bundle,
   - serves that bundle from a plain Node `http` server (no extra
     dependency),
   - drives it with Playwright (Chromium, 430×932 viewport — a typical
     phone width) — for every manifest entry it navigates to
     `/?shot=<key>` and screenshots the `[data-testid="screenshot-target"]`
     element only (no browser chrome, no tab bar), saving it as a JPEG.

## Dependencies

Already installed in this repo:

```bash
npm install --save react-native-web react-dom @expo/metro-runtime
npm install --save-dev playwright
npx playwright install chromium
```

`react-native-web` + `react-dom` + `@expo/metro-runtime` are what let
`expo export --platform web` work at all; Playwright only needs the
Chromium browser (not the full multi-browser download).

## Running it

```bash
npm run screenshots
# or directly:
node scripts/capture-screenshots.js
```

Takes a few minutes — most of it is the one-time `expo export --platform
web` build. Output:

```
screenshots/
  agritech-ShipmentCard.jpg
  agritech-CropCard.jpg
  ecommerce-Cart.jpg
  ...
```

Re-run any time after adding a new component folder — the registry
regenerates automatically, so newly added components are picked up without
editing this script.

## Notes

- The harness's `AppThemeProvider` is pinned to `initialMode="light"` for
  visual consistency across the whole set — every screenshot in `light`
  mode, capturing the app's real light-theme tokens, not each machine's OS
  theme.
- Because each component renders its own `*.usage.tsx` (not a bare,
  unstyled instance), the screenshot always shows real sample data,
  interaction affordances, and — where the component defines one — its own
  loading/empty/error state demo, exactly as a developer browsing that
  domain's gallery tab would see it.
