function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

/**
 * TanStack Form stores validator output (strings or standard-schema issues);
 * flatten either shape into helperText-friendly text.
 */
export function fieldErrorText(errors: readonly unknown[]): string | undefined {
  const messages = errors
    .filter((error) => error != null)
    .map((error) =>
      typeof error === 'string' ? error : hasMessage(error) ? error.message : 'Invalid value',
    );
  return messages.length > 0 ? messages.join(', ') : undefined;
}

/**
 * Field names the form engine rejected, as handed to `FormSchemaV2.onError`.
 *
 * `onError` receives whatever failed — a normalized `AppError` from the API
 * call, or `{ invalidFields }` from the engine — so its parameter is
 * `unknown`. This narrows the second shape without the unchecked
 * `errors.invalidFields as string[]` the call sites used to rely on, which
 * would have handed non-string entries straight through to the UI.
 */
export function extractInvalidFields(errors: unknown): string[] {
  if (typeof errors !== 'object' || errors === null) return [];

  const { invalidFields } = errors as { invalidFields?: unknown };
  if (!Array.isArray(invalidFields)) return [];

  return invalidFields.filter((field): field is string => typeof field === 'string');
}

import { logWarning } from '@/utils/errorLogger';

import type { FieldConfigV2, FieldValue } from '@/types/formSystem';

/**
 * A function a JSON schema may reference by name. The schema itself cannot
 * type-check that reference — resolving it, and reporting a name that is not
 * registered, is what `resolveFields` below is for.
 */
export type SchemaHandler = (value: FieldValue) => unknown;

export type HandlerRegistry = Record<string, SchemaHandler>;

/**
 * Swaps a schema's string handler references for the real functions.
 *
 * `resolveFields` is shared between ProductForm and OrderForm — the logic is
 * identical: walk the schema, and for each `customOverride` whose handler is a
 * string, look it up in the registry. A missing name logs a warning rather than
 * throwing, so one bad field name does not crash the form.
 */
export function resolveFields(
  rawFields: FieldConfigV2[],
  registry: HandlerRegistry,
  context: { sourceFile: string; formName: string },
): FieldConfigV2[] {
  return rawFields.map((field) => {
    if (!field.customOverride) return field;

    const resolveHandler = <THandler extends SchemaHandler>(
      reference: THandler | string | undefined,
    ): THandler | undefined => {
      if (typeof reference !== 'string') return reference;
      const handler = registry[reference];
      if (!handler) {
        logWarning({
          fileName: context.sourceFile,
          lineNumber: null,
          apiEndpoint: null,
          httpMethod: null,
          error: 'SCHEMA_HANDLER_UNRESOLVED',
          errorDescription: `No handler named "${reference}" is registered for field "${field.name}".`,
          context: { formName: context.formName, field: field.name },
        });
        return undefined;
      }
      return handler as THandler;
    };

    return {
      ...field,
      customOverride: {
        ...field.customOverride,
        validation: resolveHandler(field.customOverride.validation),
        onCustomChange: resolveHandler(field.customOverride.onCustomChange),
        onCustomBlur: resolveHandler(field.customOverride.onCustomBlur),
      },
    };
  });
}
