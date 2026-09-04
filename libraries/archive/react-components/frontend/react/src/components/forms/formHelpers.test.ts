import { describe, expect, it } from 'vitest';

import { extractInvalidFields, fieldErrorText } from './formHelpers';

describe('extractInvalidFields', () => {
  it('returns the field names the engine rejected', () => {
    expect(extractInvalidFields({ invalidFields: ['title', 'price'] })).toEqual(['title', 'price']);
  });

  it('returns an empty list for the other shape onError receives', () => {
    // A normalized AppError, i.e. a failed submit rather than a blocked one.
    expect(extractInvalidFields({ kind: 'api', message: 'Boom', status: 500 })).toEqual([]);
  });

  it.each([null, undefined, 'a string', 42, []])('tolerates %o', (input) => {
    expect(extractInvalidFields(input)).toEqual([]);
  });

  it('ignores a non-array invalidFields', () => {
    expect(extractInvalidFields({ invalidFields: 'title' })).toEqual([]);
  });

  /**
   * The call sites previously did `errors.invalidFields as string[]`, an
   * unchecked cast — anything in that array reached the UI, where it was
   * counted and printed as a field name.
   */
  it('drops entries that are not strings', () => {
    expect(extractInvalidFields({ invalidFields: ['title', 7, null, { a: 1 }, 'price'] })).toEqual([
      'title',
      'price',
    ]);
  });
});

describe('fieldErrorText', () => {
  it('returns undefined when there is nothing to report', () => {
    expect(fieldErrorText([])).toBeUndefined();
    expect(fieldErrorText([null, undefined])).toBeUndefined();
  });

  it('passes string validator output straight through', () => {
    expect(fieldErrorText(['Title is required'])).toBe('Title is required');
  });

  it('reads the message off a standard-schema issue', () => {
    expect(fieldErrorText([{ message: 'Must be a number' }])).toBe('Must be a number');
  });

  it('joins several errors into one line of helper text', () => {
    expect(fieldErrorText(['Too short', { message: 'Wrong format' }])).toBe(
      'Too short, Wrong format',
    );
  });

  it('falls back to a generic message for an unrecognised shape', () => {
    expect(fieldErrorText([{ code: 'nope' }])).toBe('Invalid value');
  });
});
