import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ConsentClause, ConsentDecision } from '../_core/telehealth.types';

export interface ConsentDialogData {
  readonly title: string;
  readonly intro?: string;
  readonly clauses: readonly ConsentClause[];
  /** Stamped into every decision. A consent record without the version of the
   *  document consented to cannot be defended later. */
  readonly documentVersion: string;
  readonly acceptLabel?: string;
  readonly declineLabel?: string;
}

export type ConsentDialogResult =
  | { readonly outcome: 'accepted'; readonly decisions: readonly ConsentDecision[] }
  | { readonly outcome: 'declined'; readonly decisions: readonly ConsentDecision[] }
  | { readonly outcome: 'dismissed' };

/**
 * Consent capture, as an auditable record rather than a checkbox.
 *
 * Benchmarks in ./README.md — Teladoc and Amwell for pre-consult consent gates,
 * MyChart for versioned document acknowledgement.
 *
 * Four rules this component enforces, each of which is a compliance
 * requirement before it is a UX preference:
 *
 * 1. **Nothing is pre-ticked.** A checkbox that arrives checked is not consent;
 *    it is an assumption the patient has to notice and undo.
 * 2. **Optional consents are genuinely optional.** Declining a research-use
 *    clause must not block the consultation, and the UI says which clauses are
 *    required rather than implying all of them are.
 * 3. **Every clause produces a decision, including the declines.** "Not
 *    granted" is a fact the audit trail needs; absence is not evidence.
 * 4. **The dialog cannot be dismissed by clicking the backdrop.** An accidental
 *    dismissal must be distinguishable from a considered decline, so the caller
 *    disables `disableClose` and reads `outcome: 'dismissed'`.
 */
@Component({
  selector: 'app-consent-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatCheckboxModule, MatIconModule],
  templateUrl: './consent-dialog.html',
  styleUrl: './consent-dialog.scss',
})
export class ConsentDialog {
  protected readonly data = inject<ConsentDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ConsentDialog, ConsentDialogResult>>(MatDialogRef);

  /** Nothing starts granted. */
  private readonly granted = signal<ReadonlySet<string>>(new Set());
  protected readonly attempted = signal(false);

  protected readonly requiredClauses = computed(() => this.data.clauses.filter((c) => c.required));
  protected readonly optionalClauses = computed(() => this.data.clauses.filter((c) => !c.required));

  protected readonly missingRequired = computed(() =>
    this.requiredClauses().filter((clause) => !this.granted().has(clause.id)),
  );

  protected readonly canAccept = computed(() => this.missingRequired().length === 0);

  protected isGranted(clauseId: string): boolean {
    return this.granted().has(clauseId);
  }

  protected toggle(clauseId: string, checked: boolean): void {
    this.granted.update((current) => {
      const next = new Set(current);
      if (checked) next.add(clauseId);
      else next.delete(clauseId);
      return next;
    });
  }

  protected onAccept(): void {
    this.attempted.set(true);
    if (!this.canAccept()) return;
    this.dialogRef.close({ outcome: 'accepted', decisions: this.snapshot() });
  }

  /**
   * Declining still records decisions. A patient who read the terms and said no
   * is a different audit entry from one who never opened the dialog, and only
   * the record can tell them apart.
   */
  protected onDecline(): void {
    this.dialogRef.close({ outcome: 'declined', decisions: this.snapshot() });
  }

  /**
   * One timestamp for the whole interaction rather than one per checkbox: the
   * decision was made when the patient pressed the button, not when they
   * happened to tick a box while reading.
   */
  private snapshot(): readonly ConsentDecision[] {
    const decidedAt = new Date().toISOString();
    const granted = this.granted();
    return this.data.clauses.map((clause) => ({
      clauseId: clause.id,
      kind: clause.kind,
      granted: granted.has(clause.id),
      decidedAt,
      documentVersion: this.data.documentVersion,
    }));
  }
}
