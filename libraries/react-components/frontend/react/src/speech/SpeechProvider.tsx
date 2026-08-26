import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

import { snackbar } from '@/components/snackbar/snackbarBus';
import { logWarning } from '@/utils/errorLogger';
import { addBreadcrumb } from '@/utils/monitoring';

import { matchCommand, type SpeechCommand } from './commandMatcher';
import { SpeechContext, type SpeechContextValue } from './speechContext';
import {
  getSpeechState,
  getStoredMicPreference,
  setSpeechState,
  setStoredMicPreference,
} from './speechStore';

/** Requested per the product spec; Indian English recognizes local place/product names better. */
const LANGUAGE = 'en-IN';

/** Auto-off after this much silence. */
export const INACTIVITY_TIMEOUT_MS = 3 * 60_000;

/** How often the watchdog checks for inactivity and for a dropped engine. */
const WATCHDOG_INTERVAL_MS = 15_000;

/** Clears the "no match" flash. */
const FAILURE_FLASH_MS = 1_500;

/**
 * One static command handed to the library, forever.
 *
 * The splat matches any final transcript, so the library never needs to know
 * about our commands — which is what keeps registration from re-rendering
 * anything. `matchInterim` stays off (its default) so we act on settled speech
 * only, and the callback reads a ref, so this array is created once at module
 * scope and its identity never changes.
 */
type SplatCallback = (phrase: string) => void;
let dispatchPhrase: SplatCallback = () => undefined;

const STATIC_COMMANDS = [
  {
    command: '*',
    callback: (phrase: string) => {
      dispatchPhrase(phrase);
    },
  },
];

export function SpeechProvider({ children }: { children: ReactNode }) {
  // Registry, timers and the "do we want to be listening" intent are all refs:
  // none of them should cause a render, and all of them are read from callbacks
  // rather than during render.
  const registry = useRef(new Map<string, readonly SpeechCommand[]>());
  const wantListening = useRef(getStoredMicPreference());
  const failureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);

  // `transcribing: false` is the single most important line here: the library
  // then skips its transcript dispatch entirely, so this provider never
  // re-renders on speech — while `matchCommands` still runs. Verified in the
  // library source; see SpeechCMD.md.
  const { listening, browserSupportsSpeechRecognition, isMicrophoneAvailable } =
    useSpeechRecognition({
      transcribing: false,
      clearTranscriptOnListen: false,
      commands: STATIC_COMMANDS,
    });

  const flattenCommands = useCallback(
    (): SpeechCommand[] => [...registry.current.values()].flat(),
    [],
  );

  /**
   * `resetActivity` distinguishes a user turning the mic on from the watchdog
   * reviving a dropped session. Only the former is activity: if a restart also
   * reset the clock, an engine that drops every few seconds would hold the mic
   * open forever and the inactivity timeout could never fire.
   */
  const start = useCallback(async (resetActivity = true) => {
    if (startingRef.current) return;
    startingRef.current = true;
    setSpeechState({ status: 'starting' });
    try {
      await SpeechRecognition.startListening({ continuous: true, language: LANGUAGE });
      if (resetActivity) setSpeechState({ lastActivityAt: Date.now() });
    } catch (error) {
      // The usual cause is a blocked mic: browsers only grant it from a user
      // gesture or a prior grant, so the default-on start can legitimately fail.
      wantListening.current = false;
      setSpeechState({ status: 'denied' });
      logWarning({
        channel: 'app',
        fileName: 'SpeechProvider.tsx',
        error: 'SPEECH_START_FAILED',
        errorDescription:
          error instanceof Error ? error.message : 'Could not start speech recognition.',
        context: { kind: 'speech' },
      });
    } finally {
      startingRef.current = false;
    }
  }, []);

  const stop = useCallback(async () => {
    await SpeechRecognition.stopListening();
    setSpeechState({ status: 'off' });
  }, []);

  const setMicEnabled = useCallback(
    (enabled: boolean) => {
      wantListening.current = enabled;
      setStoredMicPreference(enabled);
      if (enabled) void start();
      else void stop();
    },
    [start, stop],
  );

  const toggleMic = useCallback(() => {
    setMicEnabled(!wantListening.current);
  }, [setMicEnabled]);

  /* Phrase dispatch ------------------------------------------------- */

  // Assigned rather than passed as a prop so STATIC_COMMANDS never changes.
  useEffect(() => {
    dispatchPhrase = (phrase: string) => {
      const now = Date.now();
      const match = matchCommand(phrase, flattenCommands());

      setSpeechState({
        lastHeard: phrase,
        lastMatched: match ? match.command.phrases[0] : null,
        lastFailed: match === null,
        // Any recognized speech counts as activity, matched or not — the user
        // is clearly still using the feature even when a phrase misses.
        lastActivityAt: now,
      });

      addBreadcrumb('ui', `speech: ${phrase}`, { matched: match?.command.id ?? null });

      if (failureTimer.current) clearTimeout(failureTimer.current);
      if (match) {
        try {
          match.command.run();
        } catch (error) {
          logWarning({
            channel: 'app',
            fileName: 'SpeechProvider.tsx',
            error: 'SPEECH_COMMAND_FAILED',
            errorDescription:
              error instanceof Error ? error.message : `Command "${match.command.id}" threw.`,
            context: { kind: 'speech', command: match.command.id },
          });
        }
      } else {
        failureTimer.current = setTimeout(() => {
          setSpeechState({ lastFailed: false });
        }, FAILURE_FLASH_MS);
      }
    };

    return () => {
      dispatchPhrase = () => undefined;
    };
  }, [flattenCommands]);

  /* Status mirroring ------------------------------------------------ */

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      setSpeechState({ status: 'unsupported' });
      return;
    }
    if (!isMicrophoneAvailable) {
      setSpeechState({ status: 'denied' });
      return;
    }
    setSpeechState({
      status: listening ? 'listening' : wantListening.current ? 'starting' : 'off',
    });
  }, [listening, browserSupportsSpeechRecognition, isMicrophoneAvailable]);

  /* Default-on start ------------------------------------------------ */

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) return;
    if (!wantListening.current) return;
    void start();
    // Runs once support is known; `start` is stable and guards re-entry.
  }, [browserSupportsSpeechRecognition, start]);

  /* Watchdog: inactivity auto-off, and restart if the engine drops --- */

  useEffect(() => {
    if (!browserSupportsSpeechRecognition) return undefined;

    const interval = setInterval(() => {
      if (!wantListening.current) return;

      if (Date.now() - getSpeechState().lastActivityAt >= INACTIVITY_TIMEOUT_MS) {
        // Auto-off is a timeout, not a decision: leave the stored preference
        // alone so the next reload still comes up listening.
        wantListening.current = false;
        void SpeechRecognition.stopListening();
        setSpeechState({ status: 'off' });
        snackbar.info('Microphone switched off after 3 minutes of silence.');
        return;
      }

      // Chrome ends a "continuous" session on its own after a while, and some
      // engines do not support continuous at all. Either way, if we want to be
      // listening and are not, start again.
      if (!getSpeechStateIsListening()) void start(false);
    }, WATCHDOG_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [browserSupportsSpeechRecognition, start]);

  /* Teardown --------------------------------------------------------- */

  useEffect(
    () => () => {
      if (failureTimer.current) clearTimeout(failureTimer.current);
      void SpeechRecognition.abortListening();
    },
    [],
  );

  const value = useMemo<SpeechContextValue>(
    () => ({
      register: (ownerId, commands) => {
        registry.current.set(ownerId, commands);
        return () => {
          registry.current.delete(ownerId);
        };
      },
      getCommands: flattenCommands,
      toggleMic,
      setMicEnabled,
    }),
    [flattenCommands, toggleMic, setMicEnabled],
  );

  // `children` is created by this provider's parent, so its element identity is
  // stable across the re-renders `listening` causes here — React bails out on
  // the subtree instead of re-rendering the app every time the mic toggles.
  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

function getSpeechStateIsListening(): boolean {
  return getSpeechState().status === 'listening';
}
