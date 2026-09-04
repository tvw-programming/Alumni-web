import { useContext, useEffect, useId } from 'react';

import { SpeechContext, type SpeechContextValue } from './speechContext';

import type { SpeechCommand } from './commandMatcher';

/**
 * The speech actions, or null outside the provider.
 *
 * Voice is an enhancement, so anything that merely *offers* commands should
 * degrade quietly rather than crash — a page rendered in isolation (a test, a
 * preview) must still work.
 */
export function useOptionalSpeechContext(): SpeechContextValue | null {
  return useContext(SpeechContext);
}

/**
 * The speech actions, required.
 *
 * For components whose whole reason to exist is the mic — the toggle button, the
 * help sheet. Rendering those without the provider is a wiring bug, and failing
 * loudly is better than a dead button.
 */
export function useSpeechContext(): SpeechContextValue {
  const context = useOptionalSpeechContext();
  if (context === null) {
    throw new Error('useSpeechContext must be used inside <SpeechProvider>.');
  }
  return context;
}

/**
 * Registers commands for as long as the calling component is mounted.
 *
 * Registration writes into a ref-backed registry, so it renders nothing — not
 * the provider, not the caller, not the app. The only cost is a Map write on
 * mount and a delete on unmount.
 *
 * `commands` MUST be referentially stable (module constant, or `useMemo` with
 * honest dependencies). An array rebuilt every render would re-register on
 * every render — harmless in effect, but pure waste in the hot path.
 */
export function useSpeechCommands(commands: readonly SpeechCommand[]): void {
  const context = useOptionalSpeechContext();
  const ownerId = useId();

  useEffect(() => {
    if (context === null) return undefined;
    return context.register(ownerId, commands);
  }, [context, ownerId, commands]);
}
