import type { RegisterOptions } from 'react-hook-form';

import type { FieldRule } from './types';

/**
 * Rule *names* map to validators here, in the client. The server never sends a
 * regex or a function — that would be remote code execution with extra steps.
 */
/** RHF's `RegisterOptions` is a union of mutually exclusive shapes, so we
 *  accumulate into a plain bag and assert once at the end. */
type RuleBag = Record<string, unknown>;

const NAMED: Record<string, RuleBag> = {
  required: { required: 'This field is required' },
  email: {
    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, message: 'Enter a valid email address' },
  },
  phone: {
    pattern: { value: /^\d{8,15}$/, message: 'Enter a valid phone number' },
  },
  numeric: {
    pattern: { value: /^-?\d+(\.\d+)?$/, message: 'Numbers only' },
  },
  positive: {
    validate: (value: unknown) => Number(value) > 0 || 'Must be greater than zero',
  },
};

const PARAMETERISED = {
  minLength: (value: number, message?: string): RuleBag => ({
    minLength: { value, message: message ?? `Must be at least ${value} characters` },
  }),
  maxLength: (value: number, message?: string): RuleBag => ({
    maxLength: { value, message: message ?? `Must be at most ${value} characters` },
  }),
  min: (value: number, message?: string): RuleBag => ({
    min: { value, message: message ?? `Must be at least ${value}` },
  }),
  max: (value: number, message?: string): RuleBag => ({
    max: { value, message: message ?? `Must be at most ${value}` },
  }),
  matches: (value: string, message?: string): RuleBag => ({
    validate: (input: unknown) =>
      new RegExp(value).test(String(input ?? '')) || message || 'Invalid format',
  }),
} as const;

export const buildRules = (rules: FieldRule[] = []): RegisterOptions =>
  rules.reduce<RuleBag>((acc, rule) => {
    if (typeof rule === 'string') {
      return { ...acc, ...(NAMED[rule] ?? {}) };
    }
    const builder = PARAMETERISED[rule.name];
    if (!builder) return acc;
    const built =
      rule.name === 'matches'
        ? PARAMETERISED.matches(String(rule.value), rule.message)
        : builder(Number(rule.value) as never, rule.message);
    return { ...acc, ...built };
  }, {}) as RegisterOptions;
