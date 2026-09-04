import { describe, expect, it } from 'vitest';

import { capitalize, toDisplayString } from './format';

describe('toDisplayString', () => {
  it('passes strings through untouched', () => {
    expect(toDisplayString('already text')).toBe('already text');
    expect(toDisplayString('')).toBe('');
  });

  it.each([
    [0, '0'],
    [42, '42'],
    [-1.5, '-1.5'],
    [true, 'true'],
    [false, 'false'],
  ])('renders the primitive %o as %o', (input, expected) => {
    expect(toDisplayString(input)).toBe(expected);
  });

  it('treats absent values as empty', () => {
    expect(toDisplayString(null)).toBe('');
    expect(toDisplayString(undefined)).toBe('');
  });

  /**
   * The reason this helper exists. `String({})` is '[object Object]', which as
   * a filter option is identical for every object-valued row — one dropdown
   * entry that matches all of them.
   */
  it('treats a plain object as absent rather than "[object Object]"', () => {
    expect(toDisplayString({})).toBe('');
    expect(toDisplayString({ id: 1, name: 'x' })).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-base-to-string -- pinning the behaviour being avoided
    expect(String({ id: 1 })).toBe('[object Object]');
  });

  it('does not throw on a null-prototype object', () => {
    expect(toDisplayString(Object.create(null))).toBe('');
  });

  it('keeps the string form of values that define their own toString', () => {
    const date = new Date('2024-03-01T12:00:00Z');

    expect(toDisplayString(date)).toBe(String(date));
    expect(toDisplayString(['a', 'b'])).toBe('a,b');
    expect(toDisplayString(10n)).toBe('10');
  });

  it('honours a custom toString on a class instance', () => {
    class Money {
      toString() {
        return '$5.00';
      }
    }

    expect(toDisplayString(new Money())).toBe('$5.00');
  });

  it('treats non-finite numbers as absent, not as the text "NaN"', () => {
    expect(toDisplayString(Number.NaN)).toBe('');
    expect(toDisplayString(Infinity)).toBe('');
    expect(toDisplayString(-Infinity)).toBe('');
  });

  it('treats values with no useful text form as absent', () => {
    expect(toDisplayString(Symbol('x'))).toBe('');
    expect(toDisplayString(() => 'never rendered')).toBe('');
  });
});

describe('capitalize', () => {
  it('uppercases the first character only', () => {
    expect(capitalize('hello world')).toBe('Hello world');
  });

  it('leaves an empty string alone', () => {
    expect(capitalize('')).toBe('');
  });

  it('is a no-op on an already-capitalised string', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });
});
