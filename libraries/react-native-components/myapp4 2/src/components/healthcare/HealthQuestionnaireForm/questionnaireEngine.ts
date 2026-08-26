import type {
  Question,
  QuestionnaireSchema,
  QuestionnaireSection,
  VisibilityCondition,
} from '../types/domain';

/**
 * Questionnaire logic, kept pure so branching can be unit-tested against the
 * clinical spec rather than exercised through the UI.
 */

export type Answers = Record<string, unknown>;

const conditionMet = (condition: VisibilityCondition, answers: Answers): boolean => {
  const value = answers[condition.questionId];
  if (condition.includes != null) {
    return Array.isArray(value) && value.includes(condition.includes);
  }
  return value === condition.equals;
};

/** A question is visible when ALL of its conditions hold. */
export const isQuestionVisible = (question: Question, answers: Answers): boolean =>
  !question.visibility?.length || question.visibility.every((condition) => conditionMet(condition, answers));

export const visibleQuestions = (section: QuestionnaireSection, answers: Answers): Question[] =>
  section.questions.filter((question) => isQuestionVisible(question, answers));

export const visibleSections = (schema: QuestionnaireSchema, answers: Answers): QuestionnaireSection[] =>
  schema.sections.filter((section) => visibleQuestions(section, answers).length > 0);

export interface ValidationResult {
  questionId: string;
  message: string;
}

export const validateSection = (
  section: QuestionnaireSection,
  answers: Answers,
): ValidationResult[] => {
  const errors: ValidationResult[] = [];

  for (const question of visibleQuestions(section, answers)) {
    const value = answers[question.id];
    const empty =
      value == null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0);

    if (question.required && empty) {
      errors.push({ questionId: question.id, message: 'Please answer this question' });
      continue;
    }
    if (empty) continue;

    for (const rule of question.validation ?? []) {
      const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
      if (rule.type === 'min' && rule.value != null && numeric < rule.value) {
        errors.push({ questionId: question.id, message: rule.message ?? `Must be at least ${rule.value}` });
      }
      if (rule.type === 'max' && rule.value != null && numeric > rule.value) {
        errors.push({ questionId: question.id, message: rule.message ?? `Must be at most ${rule.value}` });
      }
      if (rule.type === 'minLength' && rule.value != null && String(value).length < rule.value) {
        errors.push({ questionId: question.id, message: rule.message ?? `Must be at least ${rule.value} characters` });
      }
      if (rule.type === 'maxLength' && rule.value != null && String(value).length > rule.value) {
        errors.push({ questionId: question.id, message: rule.message ?? `Must be at most ${rule.value} characters` });
      }
    }
  }

  return errors;
};

/** Answers that trip a clinically-authored urgent rule. */
export const urgentAnswers = (schema: QuestionnaireSchema, answers: Answers): Question[] => {
  const flagged: Question[] = [];
  for (const section of schema.sections) {
    for (const question of section.questions) {
      if (!question.urgentIf) continue;
      const value = answers[question.id];
      const hit =
        question.urgentIf.includes != null
          ? Array.isArray(value) && value.includes(question.urgentIf.includes)
          : value === question.urgentIf.equals;
      if (hit) flagged.push(question);
    }
  }
  return flagged;
};

/**
 * Progress. Returns null when branching makes the total unknowable — showing
 * "Step 3 of 7" that later becomes "3 of 12" destroys trust in the whole form.
 */
export const progressFor = (
  schema: QuestionnaireSchema,
  answers: Answers,
  currentSectionIndex: number,
): { current: number; total: number } | null => {
  if (schema.progressIsReliable === false) return null;
  const sections = visibleSections(schema, answers);
  return { current: Math.min(currentSectionIndex + 1, sections.length), total: sections.length };
};

/** Draft answers are stored separately from a submission, and versioned with it. */
export interface QuestionnaireDraft {
  schemaId: string;
  schemaVersion: string;
  answers: Answers;
  updatedAt: string;
}

export const buildDraft = (schema: QuestionnaireSchema, answers: Answers): QuestionnaireDraft => ({
  schemaId: schema.id,
  schemaVersion: schema.version,
  answers,
  updatedAt: new Date().toISOString(),
});
