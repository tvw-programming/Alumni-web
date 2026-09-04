import type { FormValues } from './form.types';

/** True when any value is a `File`, which JSON cannot carry. */
export function hasFiles(values: FormValues): boolean {
  return Object.values(values).some(
    (value) =>
      value instanceof File || (Array.isArray(value) && value.some((v) => v instanceof File)),
  );
}

/**
 * Converts form values to `FormData` for a multipart request.
 *
 * Arrays are appended as **repeated keys** rather than a joined string, because
 * that is what HTML forms do natively and what the API's `fromForm` reads. A
 * single `tags=a,b` would be indistinguishable from one tag literally named
 * "a,b".
 *
 * Booleans and numbers are stringified explicitly: `FormData.append` would
 * coerce them anyway, but doing it here means the value the API sees is the
 * value written here, not whatever the coercion produced.
 */
export function toFormData(values: FormValues): FormData {
  const body = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') continue;

    if (value instanceof File) {
      body.append(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item instanceof File) body.append(key, item);
        else if (item !== null && item !== undefined) body.append(key, String(item));
      }
      continue;
    }

    if (typeof value === 'boolean') {
      body.append(key, value ? 'true' : 'false');
      continue;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      body.append(key, String(value));
      continue;
    }

    if (value instanceof Date) {
      body.append(key, value.toISOString());
      continue;
    }

    // Anything left is an object, which multipart has no encoding for.
    // Stringifying it keeps the value recoverable on the server; letting
    // `String()` run would send the literal text "[object Object]".
    body.append(key, JSON.stringify(value));
  }

  return body;
}

/**
 * Strips empty values for a JSON body.
 *
 * An empty string is *absence* in this form engine — an untouched optional
 * input — and sending it would overwrite a stored value with "".
 */
export function toJsonBody(values: FormValues): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    body[key] = value;
  }
  return body;
}
