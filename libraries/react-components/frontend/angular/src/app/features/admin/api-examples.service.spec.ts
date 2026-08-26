import { describe, expect, it } from 'vitest';

import { Run } from './api-examples.service';

/**
 * `Run` is what replaced TanStack's `useMutation` on the scenario pages. The
 * behaviour that matters is what it does on a *second* run that fails: a card
 * showing a good result must not be blanked by a later failure, because that is
 * the flicker the scheduler card exists to avoid.
 */
describe('Run', () => {
  it('starts idle', () => {
    const run = new Run<string>();
    expect(run.status()).toBe('idle');
    expect(run.value()).toBeNull();
    expect(run.error()).toBeNull();
  });

  it('records a successful result', async () => {
    const run = new Run<string>();
    await run.execute(() => Promise.resolve('ok'));
    expect(run.status()).toBe('success');
    expect(run.value()).toBe('ok');
    expect(run.error()).toBeNull();
  });

  it('records a failure without throwing at the call site', async () => {
    const run = new Run<string>();
    const result = await run.execute(() => Promise.reject(new Error('nope')));
    expect(result).toBeNull();
    expect(run.status()).toBe('error');
    expect(run.error()).toBeInstanceOf(Error);
  });

  it('keeps the previous value when a later run fails', async () => {
    // The scheduler card relies on this: a failed tick shows a warning and the
    // last good result, rather than emptying the card every ten seconds.
    const run = new Run<string>();
    await run.execute(() => Promise.resolve('first'));
    await run.execute(() => Promise.reject(new Error('tick failed')));
    expect(run.value()).toBe('first');
    expect(run.error()).toBeInstanceOf(Error);
  });

  it('clears a stale error when a later run succeeds', async () => {
    const run = new Run<string>();
    await run.execute(() => Promise.reject(new Error('nope')));
    await run.execute(() => Promise.resolve('recovered'));
    expect(run.error()).toBeNull();
    expect(run.value()).toBe('recovered');
  });

  it('reports refreshing only when a value is already showing', async () => {
    const run = new Run<string>();
    // First load: pending with nothing on screen is not a "refresh".
    let release!: (value: string) => void;
    const first = run.execute(() => new Promise<string>((resolve) => (release = resolve)));
    expect(run.status()).toBe('pending');
    expect(run.isRefreshing()).toBe(false);
    release('first');
    await first;

    // Second load: a value is on screen, so this one is a background refresh.
    const second = run.execute(() => new Promise<string>((resolve) => (release = resolve)));
    expect(run.isRefreshing()).toBe(true);
    release('second');
    await second;
    expect(run.isRefreshing()).toBe(false);
  });

  it('resets back to idle', async () => {
    const run = new Run<string>();
    await run.execute(() => Promise.resolve('ok'));
    run.reset();
    expect(run.status()).toBe('idle');
    expect(run.value()).toBeNull();
  });
});
