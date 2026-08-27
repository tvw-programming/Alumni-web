import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';

import { ConsentDialog, ConsentDialogData, ConsentDialogResult } from './consent-dialog';

import samples from './consent-dialog.sample.json';

/**
 * Runnable gallery. Opens the real dialog and prints the decision record that
 * would be posted to the audit API — including the declines, which is the part
 * most consent UIs quietly drop.
 */
@Component({
  selector: 'app-consent-dialog-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule],
  template: `
    <section class="usage">
      <h2>ConsentDialog</h2>

      <div class="usage__buttons">
        @for (item of cases(); track item.key) {
          <button matButton="outlined" type="button" (click)="open(item.data)">
            {{ item.key }}
          </button>
        }
      </div>

      @if (lastResult(); as result) {
        <div class="usage__result">
          <p><strong>outcome:</strong> {{ result.outcome }}</p>
          <pre>{{ pretty() }}</pre>
        </div>
      }
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; }
    .usage__buttons { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .usage__result {
      padding: 1rem; border-radius: 8px;
      border: 1px solid var(--mat-sys-outline-variant); background: var(--mat-sys-surface-container);
    }
    pre { margin: 0; overflow-x: auto; font-size: 0.75rem; }
  `,
})
export class ConsentDialogUsage {
  private readonly dialog = inject(MatDialog);

  protected readonly lastResult = signal<ConsentDialogResult | null>(null);
  protected readonly pretty = signal('');

  protected open(data: ConsentDialogData): void {
    const ref = this.dialog.open<ConsentDialog, ConsentDialogData, ConsentDialogResult>(
      ConsentDialog,
      // Backdrop dismissal disabled: an accidental dismissal must not be
      // recorded as a considered decline.
      { data, disableClose: true, width: '40rem' },
    );

    ref.afterClosed().subscribe((result) => {
      const outcome = result ?? { outcome: 'dismissed' as const };
      this.lastResult.set(outcome);
      this.pretty.set(JSON.stringify(outcome, null, 2));
    });
  }

  protected readonly cases = signal(
    Object.entries(samples as unknown as Record<string, unknown>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => ({ key, data: value as ConsentDialogData })),
  );
}
