import { describe, expect, it, vi } from 'vitest';

import {
  matchCommand,
  normalize,
  similarity,
  stripLeadIn,
  type SpeechCommand,
} from './commandMatcher';

function command(id: string, phrases: string[]): SpeechCommand {
  return { id, phrases, group: 'Test', run: vi.fn() };
}

const commands = [
  command('dashboard', ['Dashboard', 'admin dashboard', 'overview']),
  command('users', ['Manage User', 'users', 'user list']),
  command('card', ['Generic Card', 'card']),
  command('help', ['help', 'what can i say']),
  command('errors', ['Error Log', 'errors', 'monitoring']),
];

describe('normalize', () => {
  it('lowercases, strips punctuation and collapses whitespace', () => {
    expect(normalize('  Go To,  the DASHBOARD!! ')).toBe('go to the dashboard');
  });

  it('keeps letters and digits from any script', () => {
    expect(normalize('Product 42')).toBe('product 42');
  });
});

describe('stripLeadIn', () => {
  it.each([
    ['go to dashboard', 'dashboard'],
    ['open the error log', 'error log'],
    ['show me the users', 'users'],
    ['take me to team', 'team'],
    ['navigate to about', 'about'],
    ['please dashboard', 'dashboard'],
  ])('strips %s', (input, expected) => {
    expect(stripLeadIn(input)).toBe(expected);
  });

  it('leaves a phrase with no lead-in alone', () => {
    expect(stripLeadIn('error log')).toBe('error log');
  });

  it('strips only the outermost lead-in, not every one', () => {
    // "go to" is removed; "open" survives so a command literally named
    // "open sesame" would still be reachable.
    expect(stripLeadIn('go to open sesame')).toBe('open sesame');
  });
});

describe('similarity', () => {
  it('scores identical strings 1 and unrelated strings low', () => {
    expect(similarity('dashboard', 'dashboard')).toBe(1);
    expect(similarity('dashboard', 'generic card')).toBeLessThan(0.4);
  });

  it('stays high across a plural, which is the common recognition error', () => {
    expect(similarity('manage user', 'manage users')).toBeGreaterThan(0.9);
  });
});

describe('matchCommand', () => {
  it.each([
    ['dashboard', 'dashboard'],
    ['go to dashboard', 'dashboard'],
    ['open the dashboard', 'dashboard'],
    ['show me the admin dashboard', 'dashboard'],
    ['navigate to manage user', 'users'],
    ['users', 'users'],
    ['error log', 'errors'],
    ['go to monitoring', 'errors'],
  ])('routes "%s" to %s', (spoken, expectedId) => {
    expect(matchCommand(spoken, commands)?.command.id).toBe(expectedId);
  });

  it('prefers an exact hit over a similar longer command', () => {
    const result = matchCommand('card', commands);
    expect(result?.command.id).toBe('card');
    expect(result?.score).toBe(1);
  });

  it('matches a command whose own phrase starts with a lead-in word', () => {
    // "show commands" would be destroyed by blind prefix stripping; the matcher
    // tries the raw phrase too, so this still resolves.
    const withShow = [...commands, command('show', ['show commands'])];
    expect(matchCommand('show commands', withShow)?.command.id).toBe('show');
  });

  it('absorbs a small recognition error', () => {
    expect(matchCommand('manage users', commands)?.command.id).toBe('users');
  });

  it('returns null for speech that is not a command', () => {
    expect(matchCommand('what is the weather in mumbai', commands)).toBeNull();
    expect(matchCommand('', commands)).toBeNull();
    expect(matchCommand('   ', commands)).toBeNull();
  });

  it('does not fire a command on a bare lead-in', () => {
    expect(matchCommand('go to', commands)).toBeNull();
  });

  it('respects a custom threshold', () => {
    expect(matchCommand('dashbrd', commands, { threshold: 0.95 })).toBeNull();
    expect(matchCommand('dashbrd', commands, { threshold: 0.6 })?.command.id).toBe('dashboard');
  });
});
