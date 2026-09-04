import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';

import {
  AnswerValue,
  Question,
  Questionnaire,
  QuestionnaireAnswers,
} from '../_core/telehealth.types';

/**
 * Intake questionnaire with conditional branching.
 *
 * Benchmarks in ./README.md — Ada for progressive disclosure, K Health for
 * red-flag escalation, Typeform for the section rhythm.
 *
 * Three decisions:
 *
 * 1. **Hidden questions are not answered questions.** When a branch closes, its
 *    answers are dropped rather than submitted invisibly. A form that posts
 *    "chest pain: severe" for a patient who revised their answer to "no chest
 *    pain" is submitting a fabrication.
 * 2. **Red flags escalate, they do not score.** A questionnaire that quietly
 *    adds points for "difficulty breathing" and shows a total at the end has
 *    buried the only thing that mattered. Matching a red-flag value raises
 *    `escalate` immediately, and the host decides what to do.
 * 3. **Validation runs on submit, not on blur.** Intake forms are long and
 *    often completed by an unwell person; turning fields red as they move
 *    through is punishing. The summary at the end names what is missing and
 *    links to it.
 */
@Component({
  selector: 'app-health-questionnaire-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatCheckboxModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './health-questionnaire-form.html',
  styleUrl: './health-questionnaire-form.scss',
})
export class HealthQuestionnaireForm {
  readonly questionnaire = input.required<Questionnaire>();
  readonly submitting = input(false);

  /** Two-way, so a host can restore a partially completed form. */
  readonly answers = model<QuestionnaireAnswers>({});

  readonly completed = output<QuestionnaireAnswers>();
  /** Raised the moment a red-flag value is chosen — not held until submit. */
  readonly escalate = output<{ question: Question; value: AnswerValue }>();
  /**
   * There is deliberately no `answersChange` output here: `model()` already
   * synthesises one, and declaring a second is an NG1054 collision. A host
   * wanting autosave listens to `(answersChange)` on the model.
   */

  /** Set by a failed submit; drives the summary and the per-field errors. */
  protected readonly attempted = model(false);

  /** Every question in order, with its section, for flat traversal. */
  private readonly allQuestions = computed(() =>
    this.questionnaire().sections.flatMap((section) =>
      section.questions.map((question) => ({ section, question })),
    ),
  );

  /**
   * Whether a question's branch is open. Only one level of dependency is
   * resolved deliberately: deeper chains are a symptom of a questionnaire that
   * should have been split into sections, and supporting them invites forms
   * nobody can reason about.
   */
  protected isVisible(question: Question): boolean {
    const dependency = question.dependsOn;
    if (!dependency) return true;
    return String(this.answers()[dependency.questionId] ?? '') === dependency.equals;
  }

  protected readonly visibleQuestions = computed(() =>
    this.allQuestions().filter(({ question }) => this.isVisible(question)),
  );

  /** Progress over *visible* questions: counting hidden branches makes the bar
   *  jump backwards when one opens. */
  protected readonly progress = computed(() => {
    const visible = this.visibleQuestions();
    if (visible.length === 0) return 0;
    const answered = visible.filter(({ question }) => this.hasAnswer(question.id)).length;
    return Math.round((answered / visible.length) * 100);
  });

  protected readonly missing = computed(() =>
    this.visibleQuestions()
      .filter(({ question }) => question.required && !this.hasAnswer(question.id))
      .map(({ question }) => question),
  );

  protected readonly canSubmit = computed(() => this.missing().length === 0);

  protected hasAnswer(questionId: string): boolean {
    const value = this.answers()[questionId];
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  protected answerOf(questionId: string): AnswerValue {
    return this.answers()[questionId] ?? null;
  }

  protected multiAnswer(questionId: string): readonly string[] {
    const value = this.answers()[questionId];
    // Array.isArray widens a readonly array to any[]; narrow it back rather
    // than returning an implicitly-any list.
    return Array.isArray(value) ? (value as readonly string[]) : [];
  }

  protected isChecked(questionId: string, optionValue: string): boolean {
    return this.multiAnswer(questionId).includes(optionValue);
  }

  protected setAnswer(question: Question, value: AnswerValue): void {
    const next = { ...this.answers(), [question.id]: value };

    // Closing a branch drops what it collected. Submitting answers to questions
    // the patient can no longer see is submitting a fabrication.
    const pruned = this.pruneHidden(next);

    // Setting the model emits `answersChange` for any host listening.
    this.answers.set(pruned);

    if (this.isRedFlag(question, value)) {
      this.escalate.emit({ question, value });
    }
  }

  protected toggleMulti(question: Question, optionValue: string, checked: boolean): void {
    const current = this.multiAnswer(question.id);
    const next = checked
      ? [...current, optionValue]
      : current.filter((value) => value !== optionValue);
    this.setAnswer(question, next);
  }

  protected onSubmit(): void {
    this.attempted.set(true);
    if (!this.canSubmit()) return;
    this.completed.emit(this.answers());
  }

  private isRedFlag(question: Question, value: AnswerValue): boolean {
    const flags = question.redFlagValues;
    if (!flags?.length) return false;
    if (Array.isArray(value)) return value.some((entry) => flags.includes(String(entry)));
    return flags.includes(String(value));
  }

  /** Drops answers whose question is no longer reachable, repeatedly, since
   *  closing one branch can close another beneath it. */
  private pruneHidden(answers: QuestionnaireAnswers): QuestionnaireAnswers {
    const current: Record<string, AnswerValue> = { ...answers };
    let changed = true;

    while (changed) {
      changed = false;
      for (const { question } of this.allQuestions()) {
        const dependency = question.dependsOn;
        if (!dependency) continue;
        const open = String(current[dependency.questionId] ?? '') === dependency.equals;
        if (!open && question.id in current) {
          delete current[question.id];
          changed = true;
        }
      }
    }
    return current;
  }
}
