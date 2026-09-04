import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { AnswerValue, Question, Questionnaire, QuestionnaireAnswers } from '../_core/telehealth.types';
import { HealthQuestionnaireForm } from './health-questionnaire-form';

import samples from './health-questionnaire-form.sample.json';

/**
 * Runnable intake form.
 *
 * Two behaviours worth exercising here rather than reading about: answer "yes"
 * to chest pain and a follow-up appears *and* an escalation fires; change it
 * back to "no" and the follow-up's answer is dropped from the payload rather
 * than submitted invisibly.
 */
@Component({
  selector: 'app-health-questionnaire-form-usage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HealthQuestionnaireForm],
  template: `
    <section class="usage">
      <h2>HealthQuestionnaireForm</h2>

      @if (escalations().length) {
        <div class="usage__escalation" role="alert">
          <strong>Escalation raised:</strong>
          <ul>
            @for (item of escalations(); track item) {
              <li>{{ item }}</li>
            }
          </ul>
        </div>
      }

      <app-health-questionnaire-form
        [questionnaire]="questionnaire()"
        [(answers)]="answers"
        (escalate)="onEscalate($event)"
        (completed)="onCompleted($event)"
      />

      <div class="usage__payload">
        <p><strong>Payload that would be submitted</strong></p>
        <pre>{{ payload() }}</pre>
      </div>
    </section>
  `,
  styles: `
    .usage { display: flex; flex-direction: column; gap: 1.5rem; padding: 1.5rem; }
    .usage__escalation {
      padding: 0.875rem 1rem; border-radius: 8px;
      background: var(--mat-sys-error-container); color: var(--mat-sys-on-error-container);
    }
    .usage__escalation ul { margin: 0.5rem 0 0; padding-inline-start: 1.25rem; }
    .usage__payload {
      padding: 1rem; border-radius: 8px; max-width: 42rem;
      border: 1px solid var(--mat-sys-outline-variant); background: var(--mat-sys-surface-container);
    }
    pre { margin: 0; overflow-x: auto; font-size: 0.75rem; }
  `,
})
export class HealthQuestionnaireFormUsage {
  protected readonly questionnaire = signal<Questionnaire>(
    (samples as { preConsultIntake: Questionnaire }).preConsultIntake,
  );

  protected readonly answers = signal<QuestionnaireAnswers>({});
  protected readonly escalations = signal<readonly string[]>([]);

  /** Rendered live, so the pruning of closed branches is visible. */
  protected payload(): string {
    return JSON.stringify(this.answers(), null, 2);
  }

  protected onEscalate(event: { question: Question; value: AnswerValue }): void {
    const entry = `${event.question.label} → ${String(event.value)}`;
    this.escalations.update((current) =>
      current.includes(entry) ? current : [...current, entry],
    );
  }

  protected onCompleted(answers: QuestionnaireAnswers): void {
    // A real host would post this and record the questionnaire version with it.
    this.escalations.update((current) => [...current, `Submitted ${Object.keys(answers).length} answers`]);
  }
}
