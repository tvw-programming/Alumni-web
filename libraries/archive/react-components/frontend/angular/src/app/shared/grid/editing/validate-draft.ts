import type { EditorType, EditValidation } from './editing.types';

/**
 * Validate a draft value against the declarative column validation config.
 * Returns a human-readable error, or null when valid. Runs on every change —
 * Apply stays disabled (and no API call fires) while this returns an error.
 */
export function validateDraft(
  raw: string,
  editorType: EditorType,
  validation?: EditValidation,
): string | null {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return validation?.required ? 'This field is required' : null;
  }

  if (editorType === 'number' || editorType === 'rating') {
    const num = Number(trimmed);
    if (!Number.isFinite(num)) return 'Must be a valid number';
    if (validation?.min !== undefined && num < validation.min) {
      return `Must be at least ${validation.min}`;
    }
    if (validation?.max !== undefined && num > validation.max) {
      return `Must be at most ${validation.max}`;
    }
    return null;
  }

  if (validation?.minLength !== undefined && trimmed.length < validation.minLength) {
    return `Must be at least ${validation.minLength} characters`;
  }
  if (validation?.maxLength !== undefined && trimmed.length > validation.maxLength) {
    return `Must be at most ${validation.maxLength} characters`;
  }
  return null;
}
