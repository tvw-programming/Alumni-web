import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { SymptomOption } from '../_core/telehealth.types';

/**
 * Symptom picker: search, multi-select, chips.
 *
 * Benchmarks in ./README.md — Ada and Babylon for the suggest-then-confirm
 * flow, WebMD for synonym matching.
 *
 * This component exists partly as a correction. The specification it came from
 * had four defects, and the third is the interesting one:
 *
 * 1. `mat-chip-list` was removed from Angular Material in v15. The MDC-based
 *    API is `mat-chip-grid` + `mat-chip-row` for editable sets, which is what
 *    this repo already uses in `shared/forms/fields/autocomplete-field.ts`.
 * 2. `(onSelectionChange)` on `mat-option` fires for deselection too and gives
 *    no typed payload. `(optionSelected)` on the autocomplete is the supported
 *    event.
 * 3. **`computed()` reading a decorator `@Input()` never recomputes.** The
 *    original filtered list read `this.options` — a plain field — inside a
 *    `computed`. Signals only track signal reads, so the suggestions would
 *    freeze at whatever the options array was on first evaluation and never
 *    update when the parent supplied new ones. `input()` fixes it by making
 *    the read reactive.
 * 4. Keeping both `query = ''` (for `ngModel`) and a `_query` signal is two
 *    copies of one value, which desynchronise the moment either is set
 *    directly. One `model()` signal replaces both.
 */
@Component({
  selector: 'app-symptom-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
  ],
  templateUrl: './symptom-selector.html',
  styleUrl: './symptom-selector.scss',
})
export class SymptomSelector {
  /** A signal input, so `filtered` recomputes when the parent loads options. */
  readonly options = input.required<readonly SymptomOption[]>();
  readonly label = input('Search symptoms');
  readonly placeholder = input('Start typing, e.g. fever');
  readonly maxSuggestions = input(8);
  /** Triage forms cap selection: an unbounded list stops being a triage. */
  readonly maxSelected = input<number>();

  /** Two-way: the parent may seed or clear the query. */
  readonly query = model('');
  readonly selected = model<readonly SymptomOption[]>([]);

  readonly selectionChange = output<readonly SymptomOption[]>();

  /** Announced when the list changes — a combobox whose results change
   *  silently is unusable without sight. */
  protected readonly resultCount = signal(0);

  protected readonly atLimit = computed(() => {
    const max = this.maxSelected();
    return max !== undefined && this.selected().length >= max;
  });

  /**
   * Suggestions, matched on label *and* synonyms so "high temperature" finds
   * Fever — the single most useful affordance in a symptom picker, because
   * patients do not use clinical vocabulary.
   */
  protected readonly filtered = computed(() => {
    const chosen = new Set(this.selected().map((option) => option.id));
    const term = this.query().trim().toLowerCase();
    const pool = this.options().filter((option) => !chosen.has(option.id));

    if (!term) return pool.slice(0, this.maxSuggestions());

    const matches = pool.filter(
      (option) =>
        option.label.toLowerCase().includes(term) ||
        (option.synonyms ?? []).some((synonym) => synonym.toLowerCase().includes(term)),
    );
    return matches.slice(0, this.maxSuggestions());
  });

  /** Shown under the field so a match on a synonym explains itself: matching
   *  "high temperature" to "Fever" is otherwise mystifying. */
  protected matchedSynonym(option: SymptomOption): string | null {
    const term = this.query().trim().toLowerCase();
    if (!term || option.label.toLowerCase().includes(term)) return null;
    return (option.synonyms ?? []).find((s) => s.toLowerCase().includes(term)) ?? null;
  }

  protected add(option: SymptomOption): void {
    if (this.atLimit()) return;
    if (this.selected().some((s) => s.id === option.id)) return;

    const next = [...this.selected(), option];
    this.selected.set(next);
    this.selectionChange.emit(next);
    this.query.set('');
  }

  protected remove(option: SymptomOption): void {
    const next = this.selected().filter((s) => s.id !== option.id);
    this.selected.set(next);
    this.selectionChange.emit(next);
  }

  protected onQuery(value: string): void {
    this.query.set(value);
    this.resultCount.set(this.filtered().length);
  }

  /** The autocomplete's display function — the input must not fill with the
   *  chosen label, because selection becomes a chip and the field clears for
   *  the next symptom. */
  protected readonly displayNothing = (): string => '';
}
