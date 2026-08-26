// components/forms/SchemaField.tsx
//
// Rendering precedence per field (see SchemaFormWrapper):
//   1. field.customRender  — complete override for widgets outside FieldType
//   2. built-in control for field.type, merged with customOverride attributes
//   3. customOverride.styling wrapper
//
// Ported from a react-hook-form implementation onto `@tanstack/react-form` —
// the form engine every other form in this app already uses (see
// `ProductQuickAddForm.tsx`). The bridge is intentionally isolated to this one
// file plus `SchemaFormWrapper`/`FormSubmitControls`/`FormErrorLogger`; every
// field renderer in `./fields/*` only ever sees the form-agnostic
// `FieldRendererProps` contract and never changes.
//
// Re-render policy: this component subscribes to `form.store` only for the
// `isSubmitting` flag it needs for `disabled`, via `useStore` — the same
// granular-subscription discipline the original used with
// `useFormState({ control })`.

import { Alert, Box } from '@mui/material';
import { useStore, type AnyFieldApi, type AnyFormApi } from '@tanstack/react-form';
import { memo, useMemo, type ComponentType, type ReactNode } from 'react';

import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

import { resolveFieldType } from './fields/registry';
import { fieldErrorText } from './formHelpers';

import type { FieldTypeDefinition, FieldTypeMap } from './fields/types';
import type { FieldConfigV2, FieldRenderProps, FieldValue } from '@/types/formSystem';

/**
 * The two members of the form API this component uses.
 *
 * The precise type, `ReactFormExtendedApi`, takes twelve generic parameters
 * describing the form's data shape and every one of its validators. SchemaField
 * is deliberately generic over all of them — it renders whatever the JSON
 * schema describes — so threading those generics through here and through
 * every caller would buy nothing. Naming only `store` and `Field` keeps the
 * two things actually touched type-checked.
 */
interface SchemaFieldForm {
  store: AnyFormApi['store'];
  Field: ComponentType<{
    name: string;
    validators?: Record<string, unknown>;
    children: (fieldApi: AnyFieldApi) => ReactNode;
  }>;
}

interface SchemaFieldProps {
  form: SchemaFieldForm;
  field: FieldConfigV2;
  /** Wrapper-level fallback when the field config omits `debounceMs`. */
  defaultDebounceMs?: number;
  /** Per-form field types; these shadow the global registry. */
  fieldTypes?: FieldTypeMap;
}

/** Everything the field config can require synchronously, in one pass. */
function buildSyncValidator(field: FieldConfigV2, definition: FieldTypeDefinition | undefined) {
  return ({ value }: { value: FieldValue }): string | undefined => {
    if (field.required) {
      const isEmptyString = value === '' || value === null || value === undefined;
      const isEmptyArray = Array.isArray(value) && value.length === 0;
      // Booleans (a checkbox that "must be checked") and numeric ratings (a
      // rating that "must be > 0") are guarded by the type's own
      // `buildValidators` below — an empty-value check would wrongly accept
      // `false` or `0` as "present".
      if (
        (isEmptyString || isEmptyArray) &&
        typeof value !== 'boolean' &&
        typeof value !== 'number'
      ) {
        return `${field.label} is required`;
      }
    }

    if (typeof value === 'string' && value !== '') {
      if (field.validation?.minLength && value.length < field.validation.minLength) {
        return `Minimum ${field.validation.minLength} characters`;
      }
      if (field.validation?.maxLength && value.length > field.validation.maxLength) {
        return `Maximum ${field.validation.maxLength} characters`;
      }
      if (field.validation?.pattern && !field.validation.pattern.test(value)) {
        return 'Invalid format';
      }
    }

    // Type-specific rules come from the registry entry, so file-size or
    // must-be-checked logic lives beside the component that needs it.
    const typeValidators = definition?.buildValidators?.(field);
    if (typeValidators) {
      for (const validate of Object.values(typeValidators)) {
        const result = validate(value);
        if (result !== true) return result as string;
      }
    }

    if (field.validation?.custom) {
      const result = field.validation.custom(value);
      if (result !== true) return result as string;
    }

    return undefined;
  };
}

/**
 * `customOverride.validation` and `asyncValidation` may return a Promise, so
 * both run through one async validator. Always returning a Promise (even for
 * a synchronous `customOverride.validation`) keeps this branch simple; the
 * sync rules above already give instant feedback, so the small extra
 * microtask here is invisible in practice.
 */
function buildAsyncValidator(field: FieldConfigV2) {
  if (!field.asyncValidation && !field.customOverride?.validation) return undefined;

  return async ({ value }: { value: FieldValue }): Promise<string | undefined> => {
    if (field.customOverride?.validation) {
      const result = await field.customOverride.validation(value);
      if (result !== true) return result as string;
    }
    // `asyncValidation` is declared as taking a string (see FieldConfig) —
    // remote checks like "is this username free" only make sense for text.
    // Guarding here rather than widening the signature keeps that promise to
    // whoever implements one.
    if (field.asyncValidation && typeof value === 'string') {
      const result = await field.asyncValidation(value);
      if (result !== true) return result as string;
    }
    return undefined;
  };
}

function SchemaField({ form, field, defaultDebounceMs = 0, fieldTypes }: SchemaFieldProps) {
  const { customOverride, customRender } = field;

  const definition = useMemo(
    () => resolveFieldType(field.type, fieldTypes),
    [field.type, fieldTypes],
  );

  // Field-level config wins over the wrapper-level default.
  const debounceMs = field.debounceMs ?? defaultDebounceMs;

  // Only the consumer's side effect is debounced. Form state is never delayed.
  const debouncedCustomChange = useDebouncedCallback(customOverride?.onCustomChange, debounceMs);

  const onChange = useMemo(() => buildSyncValidator(field, definition), [field, definition]);
  const onChangeAsync = useMemo(() => buildAsyncValidator(field), [field]);

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

  return (
    <form.Field
      name={field.name}
      validators={
        onChangeAsync
          ? { onChange, onChangeAsync, onChangeAsyncDebounceMs: debounceMs || 300 }
          : { onChange }
      }
    >
      {(fieldApi) => {
        // AnyFieldApi types `state.value` as `any`. Narrow it back to
        // `unknown` at this single boundary, so the renderer contract stays
        // honest rather than `any` leaking into every field component.
        const currentValue: FieldValue = fieldApi.state.value;
        // `fieldApi.name` is `any` on AnyFieldApi for the same reason; it is
        // always the field name this component supplied.
        const fieldName = String(fieldApi.name);

        // Errors surface only once the user has interacted with the field —
        // matching the convention already used elsewhere in this app (see
        // ProductQuickAddForm), rather than showing every required-field
        // error the instant the form mounts.
        const errorText = fieldApi.state.meta.isTouched
          ? fieldErrorText(fieldApi.state.meta.errors)
          : undefined;

        const handleChange = (next: FieldValue) => {
          fieldApi.handleChange(next);
          debouncedCustomChange(next);
        };

        const handleBlur = (raw?: FieldValue) => {
          fieldApi.handleBlur();
          customOverride?.onCustomBlur?.(raw ?? currentValue);
        };

        // Priority 1: complete override supplied by the field author.
        if (customRender) {
          const renderProps: FieldRenderProps = {
            field,
            value: currentValue,
            error: errorText,
            onChange: handleChange,
            onBlur: () => handleBlur(),
            isSubmitting,
          };
          return <>{customRender(renderProps)}</>;
        }

        // Priority 2: registry lookup.
        if (!definition) {
          return (
            <Alert severity="error" sx={{ my: 2 }}>
              No renderer registered for field type "{field.type}" (field "{field.name}"). Register
              one with `registerFieldType` or pass it via the form's `fieldTypes` prop.
            </Alert>
          );
        }

        const Renderer = definition.render;
        const control = (
          <Renderer
            field={field}
            value={currentValue}
            error={errorText}
            disabled={isSubmitting}
            onChange={handleChange}
            onBlur={handleBlur}
            name={fieldName}
            inputRef={null}
            attrs={customOverride?.htmlAttributes ?? {}}
          />
        );

        // Priority 3: decorate with override styling, if any.
        if (customOverride?.styling) {
          return <Box sx={{ marginBottom: 2, ...customOverride.styling }}>{control}</Box>;
        }

        return control;
      }}
    </form.Field>
  );
}

export default memo(SchemaField);
