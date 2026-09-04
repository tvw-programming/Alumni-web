import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import { useState, type ReactNode } from 'react';

import { useAction } from '../../../foundation';

export interface WizardStep {
  id: string;
  label: string;
  optional?: boolean;
  render: (context: {
    values: Record<string, unknown>;
    setValue: (key: string, value: unknown) => void;
    errors: Record<string, string>;
  }) => ReactNode;
  /** Returns field errors, or an empty object when the step is valid. */
  validate?: (values: Record<string, unknown>) => Record<string, string>;
}

export interface MultiStepFormWizardProps {
  steps: WizardStep[];
  initialValues?: Record<string, unknown>;
  submitLabel?: string;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}

/**
 * A stepped form.
 *
 * Validation runs **per step, on Next**, not once at the end. A wizard that
 * accepts four screens of input and then reports an error on screen one has
 * wasted the user's time and hidden which screen is wrong.
 *
 * Values are held for the whole wizard, so going back never loses what was
 * already typed — the single most common complaint about multi-step forms.
 *
 * Only the final submit is an Action. Moving between steps is local: nothing
 * has been committed yet, and a server round trip per step turns a form into a
 * queue.
 */
export function MultiStepFormWizard({
  steps,
  initialValues = {},
  submitLabel = 'Submit',
  onSubmit,
}: MultiStepFormWizardProps) {
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [result, submit, pending] = useAction<void, 'submitted'>(async () => {
    await onSubmit(values);
    return 'submitted';
  });

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const setValue = (key: string, value: unknown) => {
    setValues((current) => ({ ...current, [key]: value }));
    // Clearing on edit: keeping an error under a field the user is fixing is
    // just noise.
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const goNext = () => {
    const stepErrors = step.validate?.(values) ?? {};
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    if (isLast) submit();
    else setIndex((current) => current + 1);
  };

  if (result.status === 'success') {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 48 }} />
            <Typography variant="h6" role="status">
              Submitted
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stepper activeStep={index} alternativeLabel sx={{ mb: 3 }}>
          {steps.map((entry) => (
            <Step key={entry.id}>
              <StepLabel
                optional={
                  entry.optional === true ? (
                    <Typography variant="caption">Optional</Typography>
                  ) : undefined
                }
              >
                {entry.label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Announced, because a visual stepper is silent to a screen reader. */}
        <Typography
          variant="caption"
          color="text.secondary"
          role="status"
          sx={{ mb: 1, display: 'block' }}
        >
          {`Step ${String(index + 1)} of ${String(steps.length)}: ${step.label}`}
        </Typography>

        {Object.keys(errors).length > 0 ? (
          <Alert severity="error" role="alert" sx={{ mb: 2 }}>
            {`${String(Object.keys(errors).length)} field${
              Object.keys(errors).length === 1 ? '' : 's'
            } on this step need attention.`}
          </Alert>
        ) : null}

        {result.status === 'error' ? (
          <Alert severity="error" role="alert" sx={{ mb: 2 }}>
            {result.message}
          </Alert>
        ) : null}

        <Box sx={{ minHeight: 140 }}>{step.render({ values, setValue, errors })}</Box>

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button
            disabled={index === 0 || pending}
            onClick={() => {
              // No validation going back: the values are kept either way.
              setErrors({});
              setIndex((current) => current - 1);
            }}
          >
            Back
          </Button>
          <Button variant="contained" disabled={pending} onClick={goNext}>
            {pending ? 'Submitting…' : isLast ? submitLabel : 'Next'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
