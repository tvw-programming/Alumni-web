import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useRef, useState } from 'react';

import { fieldError, isFailure, useAction } from '../../../foundation';

export type QuestionKind = 'single' | 'multiple' | 'text' | 'number';

export interface Question {
  id: string;
  kind: QuestionKind;
  label: string;
  helperText?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  unit?: string;
}

export interface BranchingRule {
  /** Show `showQuestionIds` only when `questionId` holds `equals`. */
  questionId: string;
  equals: string;
  showQuestionIds: string[];
}

export interface QuestionnaireSchema {
  id: string;
  version: string;
  sections: { id: string; title: string; questions: Question[] }[];
  branchingRules: BranchingRule[];
}

export type QuestionnaireValues = Record<string, unknown>;

export interface HealthQuestionnaireFormProps {
  schema: QuestionnaireSchema;
  initialValues?: QuestionnaireValues;
  onSaveDraft?: (values: QuestionnaireValues) => Promise<void>;
  onSubmit: (values: QuestionnaireValues, version: string) => Promise<void>;
}

/**
 * A schema-driven clinical questionnaire.
 *
 * The three decisions that matter:
 *
 * - **The schema is versioned and the version is submitted with the answers.**
 *   Question 4 in v2 is not question 4 in v3, and an answer set without its
 *   version cannot be interpreted later.
 * - **"Prefer not to answer" is a real option**, distinct from an empty field.
 *   Silence is not a clinical finding, and forcing an answer produces false
 *   data.
 * - **Submitted answers are never optimistic.** A draft indicator may be —
 *   the answers themselves may not.
 *
 * Validation focuses the first invalid field and summarises the rest, which is
 * what a long form needs to be completable at all.
 */
export function HealthQuestionnaireForm({
  schema,
  initialValues = {},
  onSaveDraft,
  onSubmit,
}: HealthQuestionnaireFormProps) {
  const [values, setValues] = useState<QuestionnaireValues>(initialValues);
  const firstInvalidRef = useRef<HTMLDivElement>(null);

  const visibleQuestionIds = useMemo(() => {
    const hidden = new Set<string>();
    for (const rule of schema.branchingRules) {
      if (values[rule.questionId] !== rule.equals) {
        for (const id of rule.showQuestionIds) hidden.add(id);
      }
    }
    return hidden;
  }, [schema.branchingRules, values]);

  const questions = schema.sections.flatMap((section) => section.questions);
  const visible = questions.filter((question) => !visibleQuestionIds.has(question.id));
  const answered = visible.filter((question) => {
    const value = values[question.id];
    return value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);
  });

  const [result, submit, pending] = useAction<void, 'submitted'>(async () => {
    const missing = visible.filter(
      (question) => question.required === true && values[question.id] === undefined,
    );
    if (missing.length > 0) {
      // Field errors rather than a thrown exception: the form needs them beside
      // the inputs, not in a toast that disappears.
      firstInvalidRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return {
        status: 'error',
        message: `${String(missing.length)} question${missing.length === 1 ? '' : 's'} still need an answer.`,
        fieldErrors: Object.fromEntries(
          missing.map((question) => [question.id, 'This one is required.']),
        ),
      };
    }
    await onSubmit(values, schema.version);
    return 'submitted';
  });

  const set = (id: string, value: unknown) => {
    setValues((current) => ({ ...current, [id]: value }));
  };

  const progress = visible.length === 0 ? 0 : Math.round((answered.length / visible.length) * 100);

  /**
   * Which question gets the scroll target.
   *
   * Derived rather than tracked with a mutable flag inside the render loop:
   * reassigning a variable while rendering is a side effect, and the React
   * Compiler is right to refuse it.
   */
  const firstInvalidId = isFailure(result)
    ? visible.find((question) => result.fieldErrors?.[question.id] !== undefined)?.id
    : undefined;

  return (
    <Stack spacing={3}>
      <Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          aria-label={`${String(answered.length)} of ${String(visible.length)} questions answered`}
        />
        <Typography variant="caption" color="text.secondary">
          {`${String(answered.length)} of ${String(visible.length)} answered`}
        </Typography>
      </Box>

      {result.status === 'error' ? (
        <Alert severity="error" role="alert">
          {result.message}
        </Alert>
      ) : null}
      {result.status === 'success' ? (
        <Alert severity="success">Questionnaire submitted.</Alert>
      ) : null}

      {schema.sections.map((section) => {
        const sectionQuestions = section.questions.filter((q) => !visibleQuestionIds.has(q.id));
        if (sectionQuestions.length === 0) return null;

        return (
          <Stack key={section.id} spacing={2}>
            <Typography variant="subtitle1" fontWeight={700}>
              {section.title}
            </Typography>

            {sectionQuestions.map((question) => {
              const error = fieldError(result, question.id);
              const isFirstInvalid = question.id === firstInvalidId;

              return (
                <Box key={question.id} ref={isFirstInvalid ? firstInvalidRef : undefined}>
                  <FormLabel
                    id={`${question.id}-label`}
                    error={error !== undefined}
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    {question.label}
                    {question.required === true ? ' *' : ''}
                  </FormLabel>

                  {question.helperText ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mb: 0.5 }}
                    >
                      {question.helperText}
                    </Typography>
                  ) : null}

                  {question.kind === 'single' ? (
                    <RadioGroup
                      aria-labelledby={`${question.id}-label`}
                      value={values[question.id] ?? ''}
                      onChange={(event) => {
                        set(question.id, event.target.value);
                      }}
                    >
                      {question.options?.map((option) => (
                        <FormControlLabel
                          key={option.value}
                          value={option.value}
                          control={<Radio size="small" />}
                          label={option.label}
                        />
                      ))}
                    </RadioGroup>
                  ) : null}

                  {question.kind === 'multiple' ? (
                    <Stack>
                      {question.options?.map((option) => {
                        const selected = Array.isArray(values[question.id])
                          ? (values[question.id] as string[])
                          : [];
                        return (
                          <FormControlLabel
                            key={option.value}
                            control={
                              <Checkbox
                                size="small"
                                checked={selected.includes(option.value)}
                                onChange={(event) => {
                                  set(
                                    question.id,
                                    event.target.checked
                                      ? [...selected, option.value]
                                      : selected.filter((entry) => entry !== option.value),
                                  );
                                }}
                              />
                            }
                            label={option.label}
                          />
                        );
                      })}
                    </Stack>
                  ) : null}

                  {question.kind === 'text' || question.kind === 'number' ? (
                    <TextField
                      size="small"
                      fullWidth
                      type={question.kind === 'number' ? 'number' : 'text'}
                      value={values[question.id] ?? ''}
                      error={error !== undefined}
                      helperText={error}
                      slotProps={{ input: { endAdornment: question.unit } }}
                      onChange={(event) => {
                        set(question.id, event.target.value);
                      }}
                    />
                  ) : null}

                  {error !== undefined && question.kind !== 'text' && question.kind !== 'number' ? (
                    <Typography variant="caption" color="error.main">
                      {error}
                    </Typography>
                  ) : null}
                </Box>
              );
            })}
          </Stack>
        );
      })}

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        {onSaveDraft ? (
          <Button
            onClick={() => {
              void onSaveDraft(values);
            }}
          >
            Save draft
          </Button>
        ) : null}
        <Button
          variant="contained"
          disabled={pending}
          onClick={() => {
            submit();
          }}
        >
          {pending ? 'Submitting…' : 'Submit'}
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        {`Questionnaire ${schema.id} · version ${schema.version}`}
      </Typography>
    </Stack>
  );
}
