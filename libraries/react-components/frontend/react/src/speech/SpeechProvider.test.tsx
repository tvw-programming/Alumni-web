import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { memo, useEffect, useMemo, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INACTIVITY_TIMEOUT_MS, SpeechProvider } from './SpeechProvider';
import { getSpeechState, setSpeechState } from './speechStore';
import { useSpeechCommands, useSpeechContext } from './useSpeechCommands';

import type { SpeechCommand } from './commandMatcher';

/* ------------------------------------------------------------------ */
/* Library mock                                                        */
/* ------------------------------------------------------------------ */

/** Captures the splat callback so a test can feed the provider a spoken phrase. */
let speak: (phrase: string) => void = () => undefined;
let listening = false;

// `restoreMocks: true` in vite.config strips implementations between tests, so
// these are (re)installed in beforeEach rather than at declaration.
const startListening = vi.fn();
const stopListening = vi.fn();
const abortListening = vi.fn();

vi.mock('react-speech-recognition', () => ({
  default: {
    startListening: (options: unknown): Promise<void> => startListening(options) as Promise<void>,
    stopListening: (): Promise<void> => stopListening() as Promise<void>,
    abortListening: (): Promise<void> => abortListening() as Promise<void>,
  },
  useSpeechRecognition: ({
    commands,
  }: {
    commands: { command: string; callback: (phrase: string) => void }[];
  }) => {
    speak = (phrase: string) => {
      commands[0].callback(phrase);
    };
    return {
      listening,
      browserSupportsSpeechRecognition: true,
      isMicrophoneAvailable: true,
    };
  },
}));

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

const navigate = vi.fn();

/** `render` already wraps in `act`; the provider's start is fire-and-forget. */
function renderProvider(children: ReactNode) {
  return render(<SpeechProvider>{children}</SpeechProvider>);
}

function CommandRegistrar() {
  const commands = useMemo<SpeechCommand[]>(
    () => [
      {
        id: 'nav:dashboard',
        phrases: ['Dashboard', 'overview'],
        group: 'Test',
        run: () => {
          navigate('/admin/dashboard');
        },
      },
      {
        id: 'boom',
        phrases: ['explode'],
        group: 'Test',
        run: () => {
          throw new Error('command blew up');
        },
      },
    ],
    [],
  );
  useSpeechCommands(commands);
  return null;
}

function MicControls() {
  const { toggleMic } = useSpeechContext();
  return (
    <button type="button" onClick={toggleMic}>
      toggle
    </button>
  );
}

/**
 * Counts its own renders so a test can assert speech does not re-render the
 * tree. Counting in a dependency-free effect (which runs after every commit)
 * rather than during render keeps the component pure.
 */
const renderCount = { current: 0 };
const Subtree = memo(function Subtree() {
  useEffect(() => {
    renderCount.current += 1;
  });
  return <div data-testid="subtree">subtree</div>;
});

beforeEach(() => {
  listening = false;
  startListening.mockImplementation(() => {
    listening = true;
    return Promise.resolve();
  });
  stopListening.mockImplementation(() => {
    listening = false;
    return Promise.resolve();
  });
  abortListening.mockImplementation(() => Promise.resolve());
  renderCount.current = 0;
  window.localStorage.clear();
  setSpeechState({
    status: 'off',
    lastHeard: '',
    lastMatched: null,
    lastFailed: false,
    lastActivityAt: Date.now(),
  });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SpeechProvider', () => {
  it('starts listening by default, continuously, in en-IN', () => {
    renderProvider(<CommandRegistrar />);

    expect(startListening).toHaveBeenCalledWith({ continuous: true, language: 'en-IN' });
  });

  it('does not auto-start when the user previously switched the mic off', () => {
    window.localStorage.setItem('app.speech.enabled', 'false');

    renderProvider(<CommandRegistrar />);

    expect(startListening).not.toHaveBeenCalled();
  });

  it('runs a registered command for a spoken phrase, lead-in and all', () => {
    renderProvider(<CommandRegistrar />);

    act(() => {
      speak('go to the dashboard');
    });

    expect(navigate).toHaveBeenCalledWith('/admin/dashboard');
    expect(getSpeechState().lastMatched).toBe('Dashboard');
    expect(getSpeechState().lastFailed).toBe(false);
  });

  it('flags an unmatched phrase without running anything', () => {
    renderProvider(<CommandRegistrar />);

    act(() => {
      speak('what is the weather today');
    });

    expect(navigate).not.toHaveBeenCalled();
    expect(getSpeechState().lastFailed).toBe(true);
    expect(getSpeechState().lastHeard).toBe('what is the weather today');
  });

  it('survives a command whose handler throws', () => {
    renderProvider(<CommandRegistrar />);

    expect(() => {
      act(() => {
        speak('explode');
      });
    }).not.toThrow();
  });

  it('unregisters commands when the owner unmounts', () => {
    const view = renderProvider(<CommandRegistrar />);

    view.rerender(<SpeechProvider>{null}</SpeechProvider>);

    act(() => {
      speak('dashboard');
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('switches the mic off after three minutes of silence', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    renderProvider(<CommandRegistrar />);
    expect(startListening).toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INACTIVITY_TIMEOUT_MS + 20_000);
    });

    expect(stopListening).toHaveBeenCalled();
    expect(getSpeechState().status).toBe('off');
  });

  it('keeps listening while speech keeps arriving', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    renderProvider(<CommandRegistrar />);

    // Speak every two minutes: each phrase resets the inactivity clock, so the
    // three-minute timeout must never fire.
    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2 * 60_000);
      });
      act(() => {
        speak('dashboard');
      });
    }

    expect(stopListening).not.toHaveBeenCalled();
  });

  it('toggles the mic off and persists that choice', async () => {
    const user = userEvent.setup();
    renderProvider(<MicControls />);

    await user.click(screen.getByRole('button', { name: 'toggle' }));

    expect(stopListening).toHaveBeenCalled();
    expect(window.localStorage.getItem('app.speech.enabled')).toBe('false');
  });

  it('does not re-render the app subtree when speech is recognized', () => {
    renderProvider(
      <>
        <CommandRegistrar />
        <Subtree />
      </>,
    );

    const initial = renderCount.current;
    expect(initial).toBeGreaterThan(0);

    act(() => {
      speak('dashboard');
      speak('overview');
      speak('something unrecognized');
    });

    // `transcribing: false` means the provider gets no transcript state, and
    // status lives in an external store — so recognized speech renders nothing.
    expect(renderCount.current).toBe(initial);
  });
});
