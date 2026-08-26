import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { buildValidators } from '../field-registry';
import { resolveFieldType } from '../field-registry';
import './index';

import type { FieldConfig } from '../form.types';

/**
 * `<input type="email">` does nothing on its own here: the schema form submits
 * with `novalidate`, so the browser's built-in check never runs. These tests
 * pin the validator that replaces it.
 */
describe('email field validation', () => {
  function control(type: string, value: string) {
    const field = { name: 'email', label: 'Email', type } as FieldConfig;
    return new FormControl(value, buildValidators(field, resolveFieldType(type)));
  }

  it('rejects a value that is not an email address', () => {
    expect(control('email', 'not-an-email').errors).toEqual({ email: true });
  });

  it('accepts a well-formed address', () => {
    expect(control('email', 'jane@example.com').errors).toBeNull();
  });

  it('leaves an empty optional field valid, so required stays a separate rule', () => {
    expect(control('email', '').errors).toBeNull();
  });

  it('does not apply the email rule to a plain text field', () => {
    expect(control('text', 'not-an-email').errors).toBeNull();
  });
});
