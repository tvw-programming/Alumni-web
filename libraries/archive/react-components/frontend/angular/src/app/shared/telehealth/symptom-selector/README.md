# SymptomSelector

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **Ada Health** | Design | Search-then-confirm: type, pick from suggestions, and the choice becomes a chip so the field clears for the next symptom. |
| **Ada Health** | Feature | Plain-language matching — the catalogue carries lay synonyms alongside the clinical label. |
| **Babylon Health** | Design | Selected symptoms shown as removable chips inside the field, keeping the running list visible while adding more. |
| **Babylon Health** | Feature | Capped selection, so a triage stays a triage rather than becoming an unbounded checklist. |
| **WebMD Symptom Checker** | Feature | Synonym search surfaced *with its reason* — "Fever · also called high temperature" — so an unexpected match explains itself. |
| **K Health** | Feature | Red-flag symptoms marked in the data (`redFlag`), so escalation is a property of the catalogue rather than logic buried in a component. |
| **Practo** | Design | Body-system grouping available in the model (`bodySystem`) for a categorised picker variant. |

## Four corrections to the source specification

The scaffold this replaces had defects that would ship broken:

1. **`mat-chip-list` was removed in Angular Material v15.** The current API is
   `mat-chip-grid` + `mat-chip-row`, which this repo already uses in
   `shared/forms/fields/autocomplete-field.ts`.
2. **`(onSelectionChange)` on `mat-option`** fires on deselection too and
   carries no typed payload. `(optionSelected)` on the autocomplete is correct.
3. **`computed()` reading a decorator `@Input()` never recomputes.** The
   original filtered list read `this.options` — a plain field — inside a
   `computed`. Signals track *signal* reads only, so suggestions would freeze
   at whatever the array was on first evaluation and never update when the
   parent loaded the catalogue. `input.required()` makes the read reactive.
   This is the one that would have looked like it worked in a demo with
   hard-coded options and failed the moment options arrived over HTTP.
4. **`query = ''` alongside a `_query` signal** is two copies of one value that
   desynchronise as soon as either is set directly. One `model()` replaces both,
   and gives the parent two-way access for free.

## Accessibility

- Chips live inside the `mat-form-field` via `matChipInputFor`, so Backspace
  from the input reaches the last chip — one control, not two.
- Every chip's remove button is labelled (`Remove Fever`), never a bare icon.
- Result count is announced through `role="status"`; a combobox whose list
  changes silently is unusable without sight.
- At the selection limit the input is disabled *and* the hint says why.

## Usage

```html
<app-symptom-selector
  [options]="catalogue.symptoms()"
  [(selected)]="triage.symptoms"
  [maxSelected]="10"
  (selectionChange)="triage.recalculate($event)"
/>
```
