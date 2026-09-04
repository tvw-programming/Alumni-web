import { createContext } from 'react';

import type { SpeechCommand } from './commandMatcher';

export interface SpeechContextValue {
  /** Registers commands for as long as the caller is mounted. Returns an unregister fn. */
  register: (ownerId: string, commands: readonly SpeechCommand[]) => () => void;
  /** Every currently registered command, for the help sheet. */
  getCommands: () => SpeechCommand[];
  toggleMic: () => void;
  setMicEnabled: (enabled: boolean) => void;
}

/**
 * Kept in its own module so `SpeechProvider.tsx` exports only a component and
 * Fast Refresh can preserve state across edits.
 *
 * The value is stable for the provider's lifetime: every member is a
 * `useCallback` over refs, so consuming this context never re-renders a
 * component because of speech activity. Anything that *does* change lives in
 * `speechStore`.
 */
export const SpeechContext = createContext<SpeechContextValue | null>(null);
