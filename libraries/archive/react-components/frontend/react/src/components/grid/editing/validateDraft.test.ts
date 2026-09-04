import { describe, expect, it } from 'vitest';

import { validateDraft } from './validateDraft';

/**
 * This gate is what keeps a bad value from reaching the API: Apply stays
 * disabled while it returns an error, so every branch here is a request that
 * does not fire.
 */
describe('validateDraft', () => {
  describe('emptiness', () => {
    it('accepts blank when the column is optional', () => {
      expect(validateDraft('', 'text')).toBeNull();
      expect(validateDraft('   ', 'text')).toBeNull();
    });

    it('rejects blank — including whitespace-only — when required', () => {
      expect(validateDraft('', 'text', { required: true })).toBe('This field is required');
      expect(validateDraft('   ', 'text', { required: true })).toBe('This field is required');
    });
  });

  describe('numeric editors', () => {
    it('rejects a non-numeric draft', () => {
      expect(validateDraft('abc', 'number')).toBe('Must be a valid number');
      expect(validateDraft('12abc', 'number')).toBe('Must be a valid number');
    });

    it('enforces min and max inclusively', () => {
      expect(validateDraft('4', 'number', { min: 5 })).toBe('Must be at least 5');
      expect(validateDraft('5', 'number', { min: 5 })).toBeNull();
      expect(validateDraft('11', 'number', { max: 10 })).toBe('Must be at most 10');
      expect(validateDraft('10', 'number', { max: 10 })).toBeNull();
    });

    it('applies the same rules to the rating editor', () => {
      expect(validateDraft('6', 'rating', { min: 0, max: 5 })).toBe('Must be at most 5');
      expect(validateDraft('4.5', 'rating', { min: 0, max: 5 })).toBeNull();
    });

    it('accepts negatives and decimals rather than assuming positive integers', () => {
      expect(validateDraft('-3.25', 'number')).toBeNull();
    });

    it('does not apply length rules to numbers', () => {
      // minLength on a numeric column must not reject a short valid number.
      expect(validateDraft('7', 'number', { minLength: 3 })).toBeNull();
    });
  });

  describe('text editors', () => {
    it('enforces minLength and maxLength on the trimmed value', () => {
      expect(validateDraft('ab', 'text', { minLength: 3 })).toBe('Must be at least 3 characters');
      expect(validateDraft('  abc  ', 'text', { minLength: 3 })).toBeNull();
      expect(validateDraft('abcdef', 'text', { maxLength: 5 })).toBe(
        'Must be at most 5 characters',
      );
    });

    it('accepts anything when no validation is configured', () => {
      expect(validateDraft('whatever the user typed', 'text')).toBeNull();
      expect(validateDraft('option-a', 'dropdown')).toBeNull();
    });
  });
});
