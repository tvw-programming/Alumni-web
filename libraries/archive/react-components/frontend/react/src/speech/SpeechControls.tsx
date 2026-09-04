import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { MicToggleButton } from './MicToggleButton';
import { SpeechHelpDialog } from './SpeechHelpDialog';
import { useSpeechCommands, useSpeechContext } from './useSpeechCommands';

import type { SpeechCommand } from './commandMatcher';

interface SpeechControlsProps {
  /** Wired to "log out" when the shell has a session to end. */
  onLogout?: () => void;
}

/**
 * The one thing a layout has to mount: the mic toggle, the help sheet, and the
 * commands that work everywhere.
 *
 * Bundled so adding voice to a shell is a single import rather than four, and
 * so the always-available vocabulary is defined once instead of per shell.
 */
export function SpeechControls({ onLogout }: SpeechControlsProps) {
  const navigate = useNavigate();
  const { setMicEnabled } = useSpeechContext();
  const [helpOpen, setHelpOpen] = useState(false);

  const commands = useMemo<SpeechCommand[]>(() => {
    const globalCommands: SpeechCommand[] = [
      {
        id: 'global:help',
        phrases: ['help', 'what can i say', 'voice commands', 'show commands'],
        group: 'General',
        run: () => {
          setHelpOpen(true);
        },
      },
      {
        id: 'global:close',
        phrases: ['close', 'close dialog', 'dismiss'],
        group: 'General',
        run: () => {
          setHelpOpen(false);
        },
      },
      {
        id: 'global:back',
        phrases: ['go back', 'back', 'previous page'],
        group: 'General',
        run: () => void navigate(-1),
      },
      {
        id: 'global:scroll-down',
        phrases: ['scroll down', 'page down'],
        group: 'General',
        run: () => {
          window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
        },
      },
      {
        id: 'global:scroll-up',
        phrases: ['scroll up', 'page up'],
        group: 'General',
        run: () => {
          window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
        },
      },
      {
        id: 'global:scroll-top',
        phrases: ['scroll to top', 'go to top'],
        group: 'General',
        run: () => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      },
      {
        // The one command that must work while listening, so the user can end
        // the session by voice instead of hunting for the button.
        id: 'global:stop',
        phrases: ['stop listening', 'microphone off', 'mic off', 'stop voice'],
        group: 'General',
        run: () => {
          setMicEnabled(false);
        },
      },
    ];

    if (onLogout) {
      globalCommands.push({
        id: 'global:logout',
        phrases: ['log out', 'logout', 'sign out'],
        group: 'General',
        run: onLogout,
      });
    }

    return globalCommands;
  }, [navigate, setMicEnabled, onLogout]);

  useSpeechCommands(commands);

  return (
    <>
      <MicToggleButton />
      <SpeechHelpDialog
        open={helpOpen}
        onClose={() => {
          setHelpOpen(false);
        }}
      />
    </>
  );
}
