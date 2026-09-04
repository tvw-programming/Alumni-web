import TextField from '@mui/material/TextField';

import { MultiStepFormWizard, type WizardStep } from './MultiStepFormWizard';
import sample from './sample.json';

/**
 * Wizard values are `unknown` by design — the wizard does not know the shape of
 * any particular form. `String(unknown)` would happily render "[object Object]",
 * so each step narrows what it reads.
 */
function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function MultiStepFormWizardUsage() {
  const steps: WizardStep[] = [
    {
      id: 'company',
      label: 'Company',
      render: ({ values, setValue, errors }) => (
        <TextField
          fullWidth
          size="small"
          label="Company name"
          value={text(values.companyName)}
          error={errors.companyName !== undefined}
          helperText={errors.companyName}
          onChange={(event) => {
            setValue('companyName', event.target.value);
          }}
        />
      ),
      // Validated on Next, not at the end — a wizard that reports a screen-one
      // error on screen four has wasted the user's time.
      validate: (values): Record<string, string> =>
        text(values.companyName).trim() === ''
          ? { companyName: 'A company name is required.' }
          : {},
    },
    {
      id: 'contact',
      label: 'Contact',
      render: ({ values, setValue, errors }) => (
        <TextField
          fullWidth
          size="small"
          type="email"
          label="Contact email"
          value={text(values.contactEmail)}
          error={errors.contactEmail !== undefined}
          helperText={errors.contactEmail}
          onChange={(event) => {
            setValue('contactEmail', event.target.value);
          }}
        />
      ),
      validate: (values): Record<string, string> =>
        text(values.contactEmail).includes('@')
          ? {}
          : { contactEmail: 'Enter a valid email address.' },
    },
    {
      id: 'plan',
      label: 'Plan',
      optional: true,
      render: ({ values, setValue }) => (
        <TextField
          fullWidth
          size="small"
          label="Plan"
          value={text(values.plan)}
          onChange={(event) => {
            setValue('plan', event.target.value);
          }}
        />
      ),
    },
  ];

  return (
    <MultiStepFormWizard
      steps={steps}
      initialValues={sample.initialValues}
      submitLabel="Create account"
      onSubmit={async (values) => {
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
