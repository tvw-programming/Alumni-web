// components/forms/FormErrorLogger.tsx
import { useStore, type AnyFormApi } from '@tanstack/react-form';
import { useEffect, useRef } from 'react';

import { logError } from '@/utils/errorLogger';

import { fieldErrorText } from './formHelpers';

interface FormErrorLoggerProps {
  /**
   * The `useForm()` instance from `@tanstack/react-form`.
   *
   * This component is schema-driven — field names come from a JSON schema at
   * runtime, not a compile-time-known `TFormData` shape — so the precise
   * twelve-generic form type buys nothing here. `AnyFormApi` is the right
   * width: it types the `store` this component subscribes to without
   * demanding the data shape, which is what `any` used to paper over.
   */
  form: AnyFormApi;
  /** Source file of the form being watched — recorded in the log. */
  sourceFile: string;
  /** Logical form name, recorded as log context. */
  formName: string;
  apiEndpoint?: string | null;
  httpMethod?: string | null;
}

interface FlatError {
  field: string;
  message: string;
}

/**
 * Renders nothing. Subscribes to `form.store`'s `fieldMeta` slice in
 * isolation and writes every validation failure to the custom error log.
 *
 * Using `useStore(form.store, selector)` here — rather than reading
 * `form.state.fieldMeta` from a prop passed down by the wrapper — scopes the
 * subscription to this one null-rendering leaf. This is the TanStack Form
 * equivalent of the original's `useFormState({ control })` call: the wrapper
 * itself never subscribes to field-level state, so an error transition on one
 * field never re-renders every other field.
 *
 * De-duplication: a given field+message is logged once per occurrence. When
 * the error clears, its signature is dropped so a genuine re-occurrence is
 * logged again — without this, `onChange` validation would write a log line
 * on every keystroke while a field stays invalid.
 */
export default function FormErrorLogger({
  form,
  sourceFile,
  formName,
  apiEndpoint = null,
  httpMethod = null,
}: FormErrorLoggerProps) {
  const fieldMeta = useStore(form.store, (state) => state.fieldMeta);
  const loggedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const flat: FlatError[] = Object.entries(fieldMeta ?? {}).reduce<FlatError[]>(
      (acc, [name, meta]) => {
        const errors = (meta as { errors?: unknown[] } | undefined)?.errors ?? [];
        const message = fieldErrorText(errors);
        if (message) acc.push({ field: name, message });
        return acc;
      },
      [],
    );

    const currentSignatures = new Set(flat.map((e) => `${e.field}|${e.message}`));

    flat.forEach((e) => {
      const signature = `${e.field}|${e.message}`;
      if (loggedRef.current.has(signature)) return;
      loggedRef.current.add(signature);

      logError({
        // Field validation is a user-input problem, not a system fault.
        level: 'warning',
        fileName: sourceFile,
        lineNumber: null,
        apiEndpoint,
        httpMethod,
        error: 'VALIDATION_FAILED',
        errorDescription: `${e.field}: ${e.message}`,
        context: { formName, field: e.field },
      });
    });

    // Forget signatures that are no longer failing.
    loggedRef.current.forEach((sig) => {
      if (!currentSignatures.has(sig)) loggedRef.current.delete(sig);
    });
  }, [fieldMeta, sourceFile, formName, apiEndpoint, httpMethod]);

  return null;
}
