import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { MedicalReport } from '../_core/telehealth.types';
import { ReportListItem } from './report-list-item';

import samples from './report-list-item.sample.json';

/** Runnable list — rows are read as a set, so the gallery renders them the way
 *  a results screen would. */
@Component({
  selector: 'app-report-list-item-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReportListItem],
  template: `
    <section class="usage">
      <h2>ReportListItem</h2>
      <div class="usage__list" role="list" aria-label="Your results">
        @for (item of cases(); track item.key) {
          <div role="listitem">
            <p class="usage__note"><code>{{ item.key }}</code> {{ item.note }}</p>
            <app-report-list-item
              [report]="item.report"
              (view)="lastAction.set('view ' + $event.id)"
              (download)="lastAction.set('download ' + $event.id)"
            />
          </div>
        }
      </div>
      <p class="usage__echo">last action: {{ lastAction() || '—' }}</p>
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1rem; padding: 1.5rem; max-width: 44rem; }
    .usage__list {
      border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px;
      background: var(--mat-sys-surface); overflow: hidden;
    }
    .usage__note { margin: 0.5rem 0.875rem 0; font-size: 0.6875rem; color: var(--mat-sys-on-surface-variant); }
    .usage__note code { font-weight: 600; }
    .usage__echo { font-size: 0.8125rem; }
  `,
})
export class ReportListItemUsage {
  protected readonly lastAction = signal('');

  protected readonly cases = signal(
    Object.entries(samples as unknown as Record<string, Record<string, unknown>>)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => ({
        key,
        note: (value['$comment'] as string) ?? '',
        report: value as unknown as MedicalReport,
      })),
  );
}
