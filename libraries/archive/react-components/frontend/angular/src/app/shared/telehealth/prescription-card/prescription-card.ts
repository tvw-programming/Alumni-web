import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { Prescription, PrescriptionStatus } from '../_core/telehealth.types';

const STATUS_WORDS: Readonly<Record<PrescriptionStatus, string>> = {
  active: 'Active',
  expired: 'Expired',
  cancelled: 'Cancelled',
  pendingApproval: 'Awaiting clinician approval',
};

/**
 * A prescription: who wrote it, what is on it, and whether it can still be used.
 *
 * Benchmarks in ./README.md — GoodRx for the summary layout, 1mg and PharmEasy
 * for refill mechanics, MyChart for validity framing.
 *
 * The decision that matters: **validity is stated, not implied.** A prescription
 * card that shows a list of medicines with no expiry invites a patient to take
 * a lapsed script to a pharmacy. Expiry, refills remaining and status are all
 * first-class here, and an expired script visually recedes while remaining
 * readable — it is still a record of what was prescribed.
 *
 * Every item is listed. A "+3 more" affordance on a prescription hides exactly
 * the information the patient opened it for.
 */
@Component({
  selector: 'app-prescription-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './prescription-card.html',
  styleUrl: './prescription-card.scss',
  host: { '[attr.data-status]': 'prescription().status' },
})
export class PrescriptionCard {
  readonly prescription = input.required<Prescription>();
  readonly locale = input('en-IN');
  readonly now = input<Date>(new Date());

  readonly download = output<Prescription>();
  readonly requestRefill = output<Prescription>();
  readonly viewDetails = output<Prescription>();

  protected readonly statusWord = computed(() => STATUS_WORDS[this.prescription().status]);

  protected readonly isUsable = computed(() => this.prescription().status === 'active');

  protected readonly prescribedLabel = computed(() =>
    this.formatDate(this.prescription().prescribedAt),
  );

  /** Days left, so "expires in 4 days" can be said rather than a bare date the
   *  patient has to compare against today. */
  protected readonly validityLabel = computed(() => {
    const validUntil = this.prescription().validUntil;
    if (!validUntil) return null;

    const until = new Date(validUntil);
    if (Number.isNaN(until.getTime())) return null;

    const days = Math.ceil((until.getTime() - this.now().getTime()) / 86_400_000);
    if (days < 0) return `Expired on ${this.formatDate(validUntil)}`;
    if (days === 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    if (days <= 14) return `Expires in ${days} days`;
    return `Valid until ${this.formatDate(validUntil)}`;
  });

  /** Two weeks out is when a refill request stops being premature. */
  protected readonly expiringSoon = computed(() => {
    const validUntil = this.prescription().validUntil;
    if (!validUntil || !this.isUsable()) return false;
    const until = new Date(validUntil).getTime();
    if (Number.isNaN(until)) return false;
    const days = Math.ceil((until - this.now().getTime()) / 86_400_000);
    return days >= 0 && days <= 14;
  });

  protected readonly refillLabel = computed(() => {
    const refills = this.prescription().refillsRemaining;
    if (refills === undefined) return null;
    if (refills === 0) return 'No refills remaining';
    return `${refills} ${refills === 1 ? 'refill' : 'refills'} remaining`;
  });

  protected readonly canRefill = computed(
    () => this.isUsable() && (this.prescription().refillsRemaining ?? 0) > 0,
  );

  protected readonly announcement = computed(() => {
    const prescription = this.prescription();
    const medicines = prescription.items.map((item) => item.name).join(', ');
    return [
      `Prescription from ${prescription.prescribedBy}`,
      this.prescribedLabel(),
      this.statusWord(),
      medicines,
      this.validityLabel(),
    ]
      .filter(Boolean)
      .join('. ');
  });

  private formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(this.locale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }
}
