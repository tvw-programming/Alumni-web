import { describe, expect, it } from 'vitest';

import {
  asChecked,
  asChoice,
  asFileArray,
  asInputValue,
  asNumber,
  asNumberOrNull,
  asStringArray,
  cloneEmptyValue,
} from './value-coercion';

/**
 * Every field renderer narrows through these. Form state is schema-driven, so
 * a renderer cannot know statically what shape its value has — before this
 * layer existed the contract said `any` and each renderer quietly assumed a
 * shape, producing `[object Object]`, `NaN` or a controlled/uncontrolled
 * React warning when the assumption was wrong.
 */
describe('asInputValue', () => {
  it('renders primitives as the user typed them', () => {
    expect(asInputValue('hello')).toBe('hello');
    expect(asInputValue(42)).toBe('42');
    expect(asInputValue(0)).toBe('0');
  });

  it('renders an absent value as empty, never as "null" or "undefined"', () => {
    expect(asInputValue(null)).toBe('');
    expect(asInputValue(undefined)).toBe('');
  });

  it('refuses to render an object as "[object Object]"', () => {
    expect(asInputValue({ nested: true })).toBe('');
  });
});

describe('asChecked', () => {
  it('accepts a real boolean', () => {
    expect(asChecked(true)).toBe(true);
    expect(asChecked(false)).toBe(false);
  });

  it('accepts the string form a JSON schema default may carry', () => {
    expect(asChecked('true')).toBe(true);
  });

  /** `Boolean('false')` is `true`, which would tick an unticked checkbox. */
  it('does not treat the string "false" as checked', () => {
    expect(asChecked('false')).toBe(false);
  });

  it.each([null, undefined, 0, 1, 'yes', {}])('treats %o as unchecked', (input) => {
    expect(asChecked(input)).toBe(false);
  });
});

describe('asNumberOrNull', () => {
  it('passes finite numbers through', () => {
    expect(asNumberOrNull(12.5)).toBe(12.5);
    expect(asNumberOrNull(0)).toBe(0);
  });

  it('parses numeric strings, which is what a text input stores', () => {
    expect(asNumberOrNull('42')).toBe(42);
    expect(asNumberOrNull(' 7 ')).toBe(7);
  });

  it.each([null, undefined, '', '   ', 'abc', Number.NaN, Infinity, {}, []])(
    'returns null for %o rather than NaN',
    (input) => {
      expect(asNumberOrNull(input)).toBeNull();
    },
  );
});

describe('asNumber', () => {
  it('falls back rather than propagating NaN into the UI', () => {
    expect(asNumber('not a number')).toBe(0);
    expect(asNumber(undefined, 5)).toBe(5);
  });

  it('keeps a legitimate zero', () => {
    expect(asNumber(0, 5)).toBe(0);
  });
});

describe('asStringArray', () => {
  it('returns the selected values', () => {
    expect(asStringArray(['a', 'b'])).toEqual(['a', 'b']);
  });

  it.each([null, undefined, 'a', 42, {}])('returns an empty list for %o', (input) => {
    expect(asStringArray(input)).toEqual([]);
  });

  /** A stray object would otherwise become an unselectable chip. */
  it('drops entries that are not strings', () => {
    expect(asStringArray(['a', 1, null, { b: 2 }, 'c'])).toEqual(['a', 'c']);
  });
});

describe('asChoice', () => {
  it('passes a selected string through', () => {
    expect(asChoice('shipped')).toBe('shipped');
  });

  it('renders a non-string choice safely', () => {
    expect(asChoice(3)).toBe('3');
    expect(asChoice(null)).toBe('');
    expect(asChoice({})).toBe('');
  });
});

describe('asFileArray', () => {
  const file = new File(['x'], 'a.txt', { type: 'text/plain' });

  it('wraps a single File', () => {
    expect(asFileArray(file)).toEqual([file]);
  });

  it('passes a File list through', () => {
    expect(asFileArray([file])).toEqual([file]);
  });

  /**
   * The previous inline helper asserted `File[]` without checking, so a stray
   * entry reached `.size` and `.name` and threw during validation.
   */
  it('drops entries that are not Files', () => {
    expect(asFileArray([file, 'a.txt', null, { name: 'fake' }])).toEqual([file]);
  });

  it.each([null, undefined, 'a.txt', 42])('returns an empty list for %o', (input) => {
    expect(asFileArray(input)).toEqual([]);
  });
});

describe('cloneEmptyValue', () => {
  it('clones containers so two forms never share one array', () => {
    const registered = ['a'];
    const first = cloneEmptyValue(registered) as string[];
    first.push('b');

    expect(registered).toEqual(['a']);
    expect(cloneEmptyValue(registered)).toEqual(['a']);
  });

  it('substitutes an empty string for a missing default', () => {
    // `undefined` would make React treat the input as uncontrolled on first
    // render, then warn when the first keystroke makes it controlled.
    expect(cloneEmptyValue(undefined)).toBe('');
    expect(cloneEmptyValue(null)).toBe('');
  });

  it('passes a registered scalar default through', () => {
    expect(cloneEmptyValue(false)).toBe(false);
    expect(cloneEmptyValue(0)).toBe(0);
  });
});
