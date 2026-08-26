import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INACTIVITY_TIMEOUT_MS, SpeechService } from './speech.service';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { clearLogs, getLogsByChannel } from '../errors/error-logger';

/** Records what the service asked the engine to do. */
class FakeRecognition {
  static instances: FakeRecognition[] = [];

  lang = '';
  continuous = false;
  interimResults = true;
  maxAlternatives = 0;
  started = false;
  stopped = false;
  aborted = false;

  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start(): void {
    this.started = true;
    this.onstart?.();
  }

  stop(): void {
    this.stopped = true;
  }

  abort(): void {
    this.aborted = true;
  }
}

const snackbar = { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() };

function makeService(): SpeechService {
  TestBed.configureTestingModule({
    providers: [{ provide: SnackbarService, useValue: snackbar }],
  });
  return TestBed.inject(SpeechService);
}

describe('SpeechService', () => {
  beforeEach(() => {
    clearLogs();
    localStorage.clear();
    FakeRecognition.instances = [];
    vi.clearAllMocks();
    (globalThis as Record<string, unknown>)['SpeechRecognition'] = FakeRecognition;
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['SpeechRecognition'];
    TestBed.resetTestingModule();
  });

  it('starts listening by default, continuously, in en-IN', () => {
    const service = makeService();

    expect(service.status()).toBe('listening');
    const engine = FakeRecognition.instances[0];
    expect(engine.continuous).toBe(true);
    expect(engine.lang).toBe('en-IN');
    // Interim results would fire per syllable; commands act on settled speech.
    expect(engine.interimResults).toBe(false);
  });

  it('does not auto-start when the user previously switched the mic off', () => {
    localStorage.setItem('app.speech.enabled', 'false');
    const service = makeService();

    expect(service.status()).toBe('off');
    expect(FakeRecognition.instances).toHaveLength(0);
  });

  it('reports unsupported when the browser has no engine', () => {
    delete (globalThis as Record<string, unknown>)['SpeechRecognition'];
    const service = makeService();

    expect(service.status()).toBe('unsupported');
    expect(service.isSupported).toBe(false);
  });

  it('runs a registered command for a spoken phrase, lead-in and all', () => {
    const service = makeService();
    const run = vi.fn();
    service.register('test', [{ id: 'dash', phrases: ['dashboard'], group: 'Nav', run }]);

    service.dispatch('go to dashboard');

    expect(run).toHaveBeenCalledOnce();
    expect(service.lastMatched()).toBe('dashboard');
    expect(service.lastFailed()).toBe(false);
  });

  it('does not match trailing filler words', () => {
    // Documenting the boundary rather than wishing it away: lead-ins are
    // stripped, trailing words are not, and "dashboard please" scores 0.696
    // against a 0.72 threshold. Lowering the threshold to absorb filler would
    // start matching genuinely different commands to each other.
    const service = makeService();
    const run = vi.fn();
    service.register('test', [{ id: 'dash', phrases: ['dashboard'], group: 'Nav', run }]);

    service.dispatch('go to dashboard please');

    expect(run).not.toHaveBeenCalled();
  });

  it('flags an unmatched phrase without running anything', () => {
    const service = makeService();
    const run = vi.fn();
    service.register('test', [{ id: 'dash', phrases: ['dashboard'], group: 'Nav', run }]);

    service.dispatch('make me a sandwich');

    expect(run).not.toHaveBeenCalled();
    expect(service.lastFailed()).toBe(true);
    expect(service.lastMatched()).toBeNull();
  });

  it('survives a command whose handler throws', () => {
    const service = makeService();
    service.register('test', [
      {
        id: 'boom',
        phrases: ['explode'],
        group: 'Nav',
        run: () => {
          throw new Error('handler failed');
        },
      },
    ]);

    // A throwing command must not take the session down with it.
    expect(() => { service.dispatch('explode'); }).not.toThrow();
    expect(service.status()).toBe('listening');
    expect(getLogsByChannel('app').some((e) => e.error === 'SPEECH_COMMAND_FAILED')).toBe(true);
  });

  it('unregisters commands when the owner goes away', () => {
    const service = makeService();
    const run = vi.fn();
    const unregister = service.register('test', [
      { id: 'dash', phrases: ['dashboard'], group: 'Nav', run },
    ]);

    unregister();
    service.dispatch('dashboard');

    expect(run).not.toHaveBeenCalled();
  });

  it('replaces an owner\'s commands rather than accumulating them', () => {
    const service = makeService();
    const first = vi.fn();
    const second = vi.fn();
    service.register('owner', [{ id: 'a', phrases: ['alpha'], group: 'G', run: first }]);
    service.register('owner', [{ id: 'b', phrases: ['bravo'], group: 'G', run: second }]);

    expect(service.getCommands()).toHaveLength(1);
    service.dispatch('alpha');
    expect(first).not.toHaveBeenCalled();
  });

  it('switches the mic off after three minutes of silence', () => {
    const service = makeService();

    service.tickWatchdog(Date.now() + INACTIVITY_TIMEOUT_MS);

    expect(service.status()).toBe('off');
    expect(snackbar.info).toHaveBeenCalledOnce();
  });

  it('leaves the stored preference alone when auto-switching off', () => {
    // Auto-off is a timeout, not a decision: the next reload should still come
    // up listening.
    const service = makeService();
    service.tickWatchdog(Date.now() + INACTIVITY_TIMEOUT_MS);

    expect(localStorage.getItem('app.speech.enabled')).not.toBe('false');
  });

  it('persists an explicit switch-off across a reload', () => {
    const service = makeService();
    service.setMicEnabled(false);

    expect(localStorage.getItem('app.speech.enabled')).toBe('false');
    expect(service.status()).toBe('off');
  });

  it('keeps the inactivity clock running when the watchdog revives a dropped engine', () => {
    // The bug this guards: if a restart also reset the activity clock, an
    // engine that drops every few seconds would hold the microphone open
    // forever and the timeout could never fire.
    const service = makeService();
    const engine = FakeRecognition.instances[0];

    // The engine drops.
    engine.onend?.();
    expect(service.status()).toBe('starting');

    // Watchdog revives it, well before the timeout.
    service.tickWatchdog(Date.now() + 20_000);
    expect(service.status()).toBe('listening');
    expect(FakeRecognition.instances.length).toBeGreaterThan(1);

    // The clock was never reset, so the timeout still fires on schedule.
    service.tickWatchdog(Date.now() + INACTIVITY_TIMEOUT_MS);
    expect(service.status()).toBe('off');
  });

  it('counts recognised speech as activity, matched or not', () => {
    vi.useFakeTimers();
    try {
      const service = makeService();
      const start = Date.now();

      // Speak just before the deadline. An unmatched phrase still counts: the
      // user is clearly using the feature even when a phrase misses.
      vi.advanceTimersByTime(INACTIVITY_TIMEOUT_MS - 1_000);
      service.dispatch('something unmatched');

      // A tick at the original deadline must not switch off — the phrase moved it.
      service.tickWatchdog(start + INACTIVITY_TIMEOUT_MS);
      expect(service.status()).toBe('listening');

      // ...but the deadline still arrives, measured from the phrase.
      service.tickWatchdog(start + 2 * INACTIVITY_TIMEOUT_MS);
      expect(service.status()).toBe('off');
    } finally {
      vi.useRealTimers();
    }
  });

  it('goes to denied and stops wanting the mic when access is refused', () => {
    const service = makeService();
    const engine = FakeRecognition.instances[0];

    engine.onerror?.({ error: 'not-allowed', message: 'Permission dismissed' });

    expect(service.status()).toBe('denied');
    // A denial must not become a restart loop against a blocked permission.
    service.tickWatchdog(Date.now() + 20_000);
    expect(service.status()).toBe('denied');
  });

  it('ignores silence and self-inflicted aborts', () => {
    const service = makeService();
    const engine = FakeRecognition.instances[0];

    engine.onerror?.({ error: 'no-speech' });
    engine.onerror?.({ error: 'aborted' });

    expect(service.status()).toBe('listening');
    expect(getLogsByChannel('app')).toHaveLength(0);
  });

  it('shows ordinals only while the mic is on', () => {
    const service = makeService();
    expect(service.showsOrdinals()).toBe(true);

    service.setMicEnabled(false);
    expect(service.showsOrdinals()).toBe(false);
  });
});
