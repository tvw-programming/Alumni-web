import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { SymptomOption } from '../_core/telehealth.types';
import { SymptomSelector } from './symptom-selector';

import samples from './symptom-selector.sample.json';

/**
 * Runnable gallery.
 *
 * The "load catalogue later" button is the point of the demo: it proves the
 * reactivity fix. With the original decorator-`@Input()` version the suggestion
 * list would stay empty forever after this button ran, because a `computed`
 * cannot see a non-signal field change.
 */
@Component({
  selector: 'app-symptom-selector-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SymptomSelector],
  template: `
    <section class="usage">
      <h2>SymptomSelector</h2>

      <div class="usage__controls">
        <button type="button" (click)="loadCatalogue()">Load catalogue later (proves reactivity)</button>
        <button type="button" (click)="clear()">Clear selection</button>
      </div>

      <app-symptom-selector
        [options]="catalogue()"
        [(selected)]="chosen"
        [maxSelected]="5"
        (selectionChange)="lastEmit.set($event.length)"
      />

      <div class="usage__echo">
        <p>catalogue: {{ catalogue().length }} options</p>
        <p>selected: {{ chosen().length }} · last emit: {{ lastEmit() }}</p>
        @if (redFlags().length) {
          <p class="usage__flag">
            Red-flag symptoms selected: {{ redFlagLabels() }} — a real triage would escalate here.
          </p>
        }
      </div>
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; max-width: 34rem; }
    .usage__controls { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .usage__controls button {
      padding: 0.375rem 0.75rem; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--mat-sys-outline-variant); background: none; color: inherit;
    }
    .usage__echo { font-size: 0.8125rem; color: var(--mat-sys-on-surface-variant); }
    .usage__echo p { margin: 0.125rem 0; }
    .usage__flag { color: var(--mat-sys-error); font-weight: 600; }
  `,
})
export class SymptomSelectorUsage {
  /** Starts empty on purpose — the catalogue arrives after a click. */
  protected readonly catalogue = signal<readonly SymptomOption[]>([]);
  protected readonly chosen = signal<readonly SymptomOption[]>([]);
  protected readonly lastEmit = signal(0);

  protected loadCatalogue(): void {
    const data = samples as { commonSymptoms: SymptomOption[] };
    this.catalogue.set(data.commonSymptoms);
  }

  protected clear(): void {
    this.chosen.set([]);
  }

  protected redFlags(): readonly SymptomOption[] {
    return this.chosen().filter((symptom) => symptom.redFlag);
  }

  protected redFlagLabels(): string {
    return this.redFlags().map((symptom) => symptom.label).join(', ');
  }
}
