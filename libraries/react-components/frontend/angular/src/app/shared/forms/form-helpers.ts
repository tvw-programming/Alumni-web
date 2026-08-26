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
