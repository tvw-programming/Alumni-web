import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { addBreadcrumb } from '../errors/monitoring';
import { getSpeechRecognitionConstructor } from './speech.types';
import { logWarning } from '../errors/error-logger';
import { matchCommand } from './command-matcher';
import { safeLocalStorage } from '../storage/safe-storage';

import type { MicStatus, SpeechRecognitionLike } from './speech.types';
import type { SpeechCommand } from './command-matcher';

/** Indian English recognises local place and product names better. */
const LANGUAGE = 'en-IN';

/** Auto-off after this much silence. */
export const INACTIVITY_TIMEOUT_MS = 3 * 60_000;

/** How often the watchdog checks for inactivity and for a dropped engine. */
const WATCHDOG_INTERVAL_MS = 15_000;

/** How long the "nothing matched" flash stays on the mic button. */
const FAILURE_FLASH_MS = 1_500;

const PREFERENCE_KEY = 'app.speech.enabled';

/**
 * Speech navigation over the Web Speech API.
 *
 * ## Why there is no library here
 *
 * React used `react-speech-recognition`. It has no Angular equivalent, and it
 * turns out not to need one: the library's real job was turning an event-based
 * engine into React state, and a signal does that directly. What is left is the
 * session lifecycle — which is the part that was always the actual work.
 *
 * ## What replaced the React performance workarounds
 *
 * The React provider went to some length to avoid re-rendering the app on every
 * recognised phrase: `transcribing: false` so the library skipped its own
 * dispatch, a module-scope static command array, a ref-backed registry, and a
 * separate external store read through `useSyncExternalStore` so only the mic
 * button re-rendered.
 *
 * None of that is needed. A signal notifies exactly the views that read it, so
 * status lives in a signal and only the mic button and help sheet update. The
 * registry is a plain `Map` because nothing renders from it.
 *
 * ## Session lifecycle
 *
 * Chrome ends a "continuous" session on its own after a while, and some engines
 * do not honour `continuous` at all. The watchdog restarts a dropped session,
 * and separately switches the mic off after three minutes of silence.
 */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  private readonly snackbar = inject(SnackbarService);

  private readonly Recognition = getSpeechRecognitionConstructor();
  private recognition: SpeechRecognitionLike | null = null;

  /** Owner id → that owner's commands. A Map, because nothing renders from it. */
  private readonly registry = new Map<string, readonly SpeechCommand[]>();

  /** Whether we *want* to be listening — distinct from whether we are. */
  private wantListening = readStoredPreference();

  private failureTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private lastActivityAt = Date.now();
  private starting = false;

  private readonly statusSignal = signal<MicStatus>(this.Recognition ? 'off' : 'unsupported');
  private readonly lastHeardSignal = signal('');
  private readonly lastMatchedSignal = signal<string | null>(null);
  private readonly lastFailedSignal = signal(false);

  readonly status = this.statusSignal.asReadonly();
  readonly lastHeard = this.lastHeardSignal.asReadonly();
  readonly lastMatched = this.lastMatchedSignal.asReadonly();
  readonly lastFailed = this.lastFailedSignal.asReadonly();

  readonly isListening = computed(() => this.statusSignal() === 'listening');
  readonly isSupported = this.Recognition !== null;

  /**
   * Whether positional hints should be visible.
   *
   * The sidebar shows its ordinal numbers only while the mic is on — they are
   * guidance for speaking, and clutter otherwise. `starting` counts, so the
   * numbers do not flicker in during the moment between the click and the
   * engine actually starting.
   */
  readonly showsOrdinals = computed(
    () => this.statusSignal() === 'listening' || this.statusSignal() === 'starting',
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.teardown();
    });

    if (!this.Recognition) return;

    // Default-on, per the product spec, unless the user has said otherwise.
    if (this.wantListening) this.start();
    this.startWatchdog();
  }

  // ---- Command registration ---------------------------------------------

  /**
   * Registers one owner's commands. Returns an unregister function.
   *
   * Keyed by owner so a component that re-registers replaces its own entry
   * rather than accumulating duplicates.
   */
  register(ownerId: string, commands: readonly SpeechCommand[]): () => void {
    this.registry.set(ownerId, commands);
    return () => {
      this.registry.delete(ownerId);
    };
  }

  /** Every registered command, for the help sheet. */
  getCommands(): SpeechCommand[] {
    return [...this.registry.values()].flat();
  }

  // ---- Mic control -------------------------------------------------------

  setMicEnabled(enabled: boolean): void {
    this.wantListening = enabled;
    writeStoredPreference(enabled);
    if (enabled) this.start();
    else this.stop();
  }

  toggleMic(): void {
    this.setMicEnabled(!this.wantListening);
  }

  /**
   * `resetActivity` distinguishes a user switching the mic on from the watchdog
   * reviving a dropped session.
   *
   * Only the former is activity. If a restart also reset the clock, an engine
   * that drops every few seconds would hold the microphone open indefinitely
   * and the inactivity timeout could never fire. This bug is why the parameter
   * exists; do not remove it.
   */
  private start(resetActivity = true): void {
    if (!this.Recognition || this.starting) return;
    this.starting = true;
    this.statusSignal.set('starting');

    try {
      this.recognition?.abort();
      const recognition = new this.Recognition();
      recognition.lang = LANGUAGE;
      recognition.continuous = true;
      // Interim results would fire on every syllable. Commands act on settled
      // speech only, so the engine is asked not to produce them at all.
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        this.statusSignal.set('listening');
      };

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) this.dispatch(result[0].transcript);
        }
      };

      recognition.onerror = (event) => {
        this.handleEngineError(event.error, event.message);
      };

      recognition.onend = () => {
        // Only reflect the stop; the watchdog decides whether to restart, so a
        // rapidly-dropping engine cannot become a restart loop here.
        if (this.statusSignal() === 'listening') this.statusSignal.set('starting');
      };

      this.recognition = recognition;
      recognition.start();
      if (resetActivity) this.lastActivityAt = Date.now();
    } catch (error) {
      // Usually a blocked microphone: browsers grant it only from a user
      // gesture or a prior grant, so the default-on start can legitimately fail.
      this.wantListening = false;
      this.statusSignal.set('denied');
      logWarning({
        channel: 'app',
        fileName: 'speech.service.ts',
        error: 'SPEECH_START_FAILED',
        errorDescription:
          error instanceof Error ? error.message : 'Could not start speech recognition.',
        context: { kind: 'speech' },
      });
    } finally {
      this.starting = false;
    }
  }

  private stop(): void {
    this.recognition?.stop();
    this.statusSignal.set('off');
  }

  private handleEngineError(code: string, message?: string): void {
    // `no-speech` and `aborted` are ordinary: silence, and our own restarts.
    if (code === 'no-speech' || code === 'aborted') return;

    if (code === 'not-allowed' || code === 'service-not-allowed') {
      this.wantListening = false;
      this.statusSignal.set('denied');
    }

    logWarning({
      channel: 'app',
      fileName: 'speech.service.ts',
      error: `SPEECH_${code.toUpperCase().replace(/-/g, '_')}`,
      errorDescription: message ?? `Speech recognition reported "${code}".`,
      context: { kind: 'speech' },
    });
  }

  // ---- Phrase dispatch ---------------------------------------------------

  /** Exposed for tests; production callers go through the engine's events. */
  dispatch(phrase: string): void {
    const match = matchCommand(phrase, this.getCommands());

    this.lastHeardSignal.set(phrase);
    this.lastMatchedSignal.set(match ? match.command.phrases[0] : null);
    this.lastFailedSignal.set(match === null);
    // Any recognised speech counts as activity, matched or not — the user is
    // clearly still using the feature even when a phrase misses.
    this.lastActivityAt = Date.now();

    addBreadcrumb('ui', `speech: ${phrase}`, { matched: match?.command.id ?? null });

    if (this.failureTimer) clearTimeout(this.failureTimer);

    if (!match) {
      this.failureTimer = setTimeout(() => {
        this.lastFailedSignal.set(false);
      }, FAILURE_FLASH_MS);
      return;
    }

    try {
      match.command.run();
    } catch (error) {
      // A throwing command must not take the whole session down with it.
      logWarning({
        channel: 'app',
        fileName: 'speech.service.ts',
        error: 'SPEECH_COMMAND_FAILED',
        errorDescription:
          error instanceof Error ? error.message : `Command "${match.command.id}" threw.`,
        context: { kind: 'speech', command: match.command.id },
      });
    }
  }

  // ---- Watchdog ----------------------------------------------------------

  private startWatchdog(): void {
    this.watchdog = setInterval(() => {
      this.tickWatchdog();
    }, WATCHDOG_INTERVAL_MS);
  }

  /** Exposed for tests, which drive it directly rather than waiting 15s. */
  tickWatchdog(now = Date.now()): void {
    if (!this.wantListening) return;

    if (now - this.lastActivityAt >= INACTIVITY_TIMEOUT_MS) {
      // Auto-off is a timeout, not a decision: the stored preference is left
      // alone so the next reload still comes up listening.
      this.wantListening = false;
      this.recognition?.stop();
      this.statusSignal.set('off');
      this.snackbar.info('Microphone switched off after 3 minutes of silence.');
      return;
    }

    // If we want to be listening and are not, the engine dropped. Restart
    // without resetting the activity clock — see `start`.
    if (this.statusSignal() !== 'listening') this.start(false);
  }

  private teardown(): void {
    if (this.failureTimer) clearTimeout(this.failureTimer);
    if (this.watchdog) clearInterval(this.watchdog);
    this.recognition?.abort();
  }
}

/**
 * Whether the mic should come up listening.
 *
 * Defaults to `true` — the product wants speech on out of the box — but an
 * explicit "off" survives a reload. Turning the mic back on against the user's
 * stated wish on every refresh would be hostile, so the default applies only
 * until they say otherwise.
 */
function readStoredPreference(): boolean {
  return safeLocalStorage.get(PREFERENCE_KEY) !== 'false';
}

function writeStoredPreference(enabled: boolean): void {
  safeLocalStorage.set(PREFERENCE_KEY, String(enabled));
}
