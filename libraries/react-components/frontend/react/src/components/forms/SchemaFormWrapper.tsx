// components/forms/SchemaFormWrapper.tsx
//
// Schema-driven form wrapper — renders a `FormSchemaV2` (see
// `@/types/formSystem`) as a real MUI form, wired to `@tanstack/react-form`.
//
// Ported from a react-hook-form implementation. The rendering contract and
// re-render discipline are unchanged; only the form-engine bridge points
// (this file, `SchemaField`, `FormErrorLogger`, `FormSubmitControls`) needed
// rewriting. Every field renderer in `./fields/*` is untouched.
//
// Side-effect import: this registers every built-in field type exactly once,
// the first time any form imports this wrapper — a consumer never has to
// remember a separate app-startup step.
import './fields';

import { Box, Container } from '@mui/material';
import { useForm } from '@tanstack/react-form';
import { useCallback, type FormEvent } from 'react';

import { logError } from '@/utils/errorLogger';

import FormErrorLogger from './FormErrorLogger';
import { BlockingSubmitOverlay, FormSubmitButton, SubmitRow } from './FormSubmitControls';
import SchemaField from './SchemaField';

import type { FieldTypeMap } from './fields/types';
import type { FormSchemaV2, FormValues } from '@/types/formSystem';

export interface SchemaFormWrapperProps {
  schema: FormSchemaV2;
  defaultValues?: FormValues;
  submitButtonLabel?: string;
  /**
   * true  -> full-page blocking spinner while submitting.
   * unset -> spinner inside the submit button (default).
   */
  blocking?: boolean;
  blockingMessage?: string;
  /** Fallback debounce for onCustomChange; per-field `debounceMs` wins. */
  defaultDebounceMs?: number;
  /**
   * Field types available to this form only, shadowing the global registry.
   * Lets a parent drop in a bespoke renderer without registering it app-wide.
   *
   * Pass a stable (module-level or memoized) object — a fresh literal on each
   * render would defeat memoization inside `SchemaField`.
   */
  fieldTypes?: FieldTypeMap;
  /** Recorded in the error log so entries are traceable to a source. */
  sourceFile?: string;
  formName?: string;
  apiEndpoint?: string | null;
  httpMethod?: string | null;
}

export function SchemaFormWrapper({
  schema,
  defaultValues,
  submitButtonLabel = 'Submit',
  blocking = false,
  blockingMessage,
  defaultDebounceMs = 0,
  fieldTypes,
  sourceFile = 'SchemaFormWrapper.tsx',
  formName = 'form',
  apiEndpoint = null,
  httpMethod = null,
}: SchemaFormWrapperProps) {
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      try {
        await schema.onSubmit(value);
      } catch (error) {
        const err = error as Error;

        // A thrown submit is a system fault, so it logs at `error` level —
        // distinct from the `warning` level used for field validation.
        logError({
          level: 'error',
          fileName: sourceFile,
          lineNumber: null,
          apiEndpoint,
          httpMethod,
          error: err?.name ? `SUBMIT_${err.name.toUpperCase()}` : 'SUBMIT_FAILED',
          errorDescription: err?.message ?? String(error),
          context: { formName, stack: err?.stack?.split('\n').slice(0, 3).join(' | ') },
        });

        schema.onError?.(error);
      }
    },
    // Fires when the form engine blocks submission because a field is invalid.
    onSubmitInvalid: ({ formApi }) => {
      const invalidFields = Object.entries(formApi.state.fieldMeta ?? {})
        .filter(([, meta]) => ((meta as { errors?: unknown[] })?.errors?.length ?? 0) > 0)
        .map(([name]) => name);

      schema.onError?.({ invalidFields });
    },
  });

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();
      void form.handleSubmit();
    },
    [form],
  );

  return (
    <Container maxWidth="sm">
      {/* Renders null. Watches field errors and writes them to the error log. */}
      <FormErrorLogger
        form={form}
        sourceFile={sourceFile}
        formName={formName}
        apiEndpoint={apiEndpoint}
        httpMethod={httpMethod}
      />

      <Box component="form" noValidate onSubmit={handleSubmit} sx={{ marginTop: 3 }}>
        {schema.fields.map((field) => (
          <SchemaField
            key={field.name}
            form={form}
            field={field}
            defaultDebounceMs={defaultDebounceMs}
            fieldTypes={fieldTypes}
          />
        ))}

        <SubmitRow>
          <FormSubmitButton form={form} label={submitButtonLabel} blocking={blocking} />
        </SubmitRow>
      </Box>

      {blocking && <BlockingSubmitOverlay form={form} message={blockingMessage} />}
    </Container>
  );
}

export default SchemaFormWrapper;
