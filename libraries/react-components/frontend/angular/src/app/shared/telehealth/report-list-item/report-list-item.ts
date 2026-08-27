import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MedicalReport, ReportStatus } from '../_core/telehealth.types';

const STATUS_WORDS: Readonly<Record<ReportStatus, string>> = {
  pending: 'Processing',
  ready: 'Ready',
  reviewed: 'Reviewed by your clinician',
  amended: 'Amended',
  cancelled: 'Cancelled',
};

const CATEGORY_ICONS: Readonly<Record<string, string>> = {
  lab: 'science',
  imaging: 'radiology',
  pathology: 'biotech',
  consult: 'description',
};

/**
 * One lab or imaging result in a list.
 *
 * Benchmarks in ./README.md — MyChart for the release model, LabCorp for the
 * list row, Apollo/1mg for download handling.
 *
 * The clinically important behaviour: **a result can exist and still not be
 * releasable.** `awaitingClinicianRelease` is separate from `status`, because a
 * patient reading an abnormal cancer marker before their clinician has seen it
 * is a genuine harm. The row shows that the result exists and explains the
 * wait, rather than pretending nothing is there.
 *
 * Abnormality is flagged by the source system, never derived here — same rule
 * as `VitalsCard`.
 */
@Component({
  selector: 'app-report-list-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './report-list-item.html',
  styleUrl: './report-list-item.scss',
  host: { '[attr.data-status]': 'report().status' },
})
export class ReportListItem {
  readonly report = input.required<MedicalReport>();
  readonly locale = input('en-IN');

  readonly view = output<MedicalReport>();
  readonly download = output<MedicalReport>();

  protected readonly statusWord = computed(() => STATUS_WORDS[this.report().status]);

  protected readonly icon = computed(
    () => CATEGORY_ICONS[this.report().category.toLowerCase()] ?? 'description',
  );

  protected readonly held = computed(() => this.report().awaitingClinicianRelease === true);

  protected readonly openable = computed(
    () => !this.held() && this.report().status !== 'pending' && this.report().status !== 'cancelled',
  );

  protected readonly dateLabel = computed(() => {
    const iso = this.report().reportedAt ?? this.report().collectedAt;
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(this.locale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  });

  protected readonly sizeLabel = computed(() => {
    const bytes = this.report().sizeBytes;
    if (bytes === undefined) return null;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  });

  /** Amended results matter: a corrected report supersedes one the patient may
   *  already have read and acted on. */
  protected readonly needsAttention = computed(
    () => this.report().hasAbnormalFindings === true || this.report().status === 'amended',
  );

  protected readonly announcement = computed(() => {
    const report = this.report();
    const parts = [report.title, report.category, this.dateLabel(), this.statusWord()];
    if (this.held()) parts.push('Awaiting release by your clinician');
    if (report.hasAbnormalFindings) parts.push('Contains findings outside the reference range');
    return parts.filter(Boolean).join(', ');
  });
}
