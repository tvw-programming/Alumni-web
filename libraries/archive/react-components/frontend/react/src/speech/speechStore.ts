/**
 * Speech status as an external store rather than React state.
 *
 * Status changes (listening on/off, a phrase heard) are frequent-ish and are
 * needed by exactly two small components — the mic button and the help sheet.
 * Putting them in provider state would re-render the whole app subtree; putting
 * them in context would re-render every consumer. `useSyncExternalStore` lets
 * each subscriber re-render only when the slice it selected actually changes.
 */
import { useSyncExternalStore } from 'react';

import { safeLocalStorage } from '@/utils/safeStorage';

export type MicStatus =
  | 'unsupported'
  | 'denied'
  /** User has it switched off. */
  | 'off'
  /** Switched on, waiting for the engine to actually start. */
  | 'starting'
  | 'listening';

export interface SpeechState {
  status: MicStatus;
  /** Last phrase the engine finalized, for the "heard: …" caption. */
  lastHeard: string;
  /** Label of the last command that ran, or null when nothing matched. */
  lastMatched: string | null;
  /** True briefly after a phrase matched nothing, to flash the button. */
  lastFailed: boolean;
  /** Epoch ms of the last recognized speech; drives the inactivity timeout. */
  lastActivityAt: number;
}

const PREFERENCE_KEY = 'app.speech.enabled';

const initialState: SpeechState = {
  status: 'off',
  lastHeard: '',
  lastMatched: null,
  lastFailed: false,
  lastActivityAt: Date.now(),
};

let state: SpeechState = initialState;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

export function getSpeechState(): SpeechState {
  return state;
}

export function setSpeechState(patch: Partial<SpeechState>): void {
  const next = { ...state, ...patch };
  // Reference equality is what `useSyncExternalStore` compares, so bail out on
  // a no-op patch rather than waking every subscriber.
  if (
    next.status === state.status &&
    next.lastHeard === state.lastHeard &&
    next.lastMatched === state.lastMatched &&
    next.lastFailed === state.lastFailed &&
    next.lastActivityAt === state.lastActivityAt
  ) {
    return;
  }
  state = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Subscribe to a slice of speech status.
 *
 * `selector` must return a primitive (or a stable reference); returning a fresh
 * object each call would re-render on every store write.
 */
export function useSpeechSelector<T>(selector: (state: SpeechState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initialState),
  );
}

/* ------------------------------------------------------------------ */
/* Persisted user preference                                           */
/* ------------------------------------------------------------------ */

/**
 * Whether the mic should come up listening.
 *
 * Defaults to `true` — the product wants speech on out of the box — but an
 * explicit "off" survives a reload. Turning the mic back on against the user's
 * stated wish on every refresh would be hostile, so the default only applies
 * until they say otherwise.
 */
export function getStoredMicPreference(): boolean {
  return safeLocalStorage.get(PREFERENCE_KEY) !== 'false';
}

export function setStoredMicPreference(enabled: boolean): void {
  try {
    safeLocalStorage.set(PREFERENCE_KEY, String(enabled));
  } catch {
    /* private mode — the in-memory preference still holds for this session */
  }
}
