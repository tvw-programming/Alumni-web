import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { keyframes } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';

import { useSpeechSelector } from './speechStore';
import { useSpeechContext } from './useSpeechCommands';

/**
 * Expanding ring, continuous while listening.
 *
 * A CSS keyframe animation runs on the compositor and costs no renders — the
 * alternative (animating from JS state) would re-render this button ~60 times a
 * second for a purely decorative effect.
 */
const pulse = keyframes`
  0%   { transform: scale(0.85); opacity: 0.7; }
  70%  { transform: scale(1.6);  opacity: 0; }
  100% { transform: scale(1.6);  opacity: 0; }
`;

const TOOLTIPS: Record<string, string> = {
  unsupported: 'This browser has no speech recognition',
  denied: 'Microphone blocked — allow access, then click to retry',
  off: 'Voice commands off (click to turn on)',
  starting: 'Starting the microphone…',
  listening: 'Listening — say "go to dashboard" or "help"',
};

/**
 * Mic on/off toggle for the app bars.
 *
 * Subscribes to two primitive slices of the speech store, so it re-renders only
 * when the status or the no-match flash actually changes — never on speech that
 * matched, and never because some other part of the app rendered.
 */
export function MicToggleButton() {
  const { toggleMic } = useSpeechContext();
  const status = useSpeechSelector((state) => state.status);
  const failed = useSpeechSelector((state) => state.lastFailed);

  const listening = status === 'listening';
  const disabled = status === 'unsupported';

  return (
    <Tooltip title={TOOLTIPS[status] ?? 'Voice commands'}>
      {/* Span keeps the tooltip working while the button is disabled. */}
      <Box component="span" sx={{ display: 'inline-flex' }}>
        <Badge
          color={failed ? 'warning' : 'success'}
          variant="dot"
          invisible={!listening && !failed}
          overlap="circular"
        >
          <IconButton
            color="inherit"
            onClick={toggleMic}
            disabled={disabled}
            aria-label={listening ? 'Turn voice commands off' : 'Turn voice commands on'}
            aria-pressed={listening}
            sx={
              listening
                ? {
                    position: 'relative',
                    // The ring is a pseudo-element so it cannot affect layout
                    // or push the toolbar around while it animates.
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 4,
                      borderRadius: '50%',
                      border: 2,
                      borderColor: 'success.main',
                      animation: `${pulse} 1.8s ease-out infinite`,
                      pointerEvents: 'none',
                    },
                    // Users who ask for less motion get a steady ring, not a
                    // pulse — the state stays visible, the movement does not.
                    '@media (prefers-reduced-motion: reduce)': {
                      '&::before': { animation: 'none', opacity: 0.6, transform: 'scale(1)' },
                    },
                  }
                : { position: 'relative' }
            }
          >
            {listening ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
        </Badge>
      </Box>
    </Tooltip>
  );
}
