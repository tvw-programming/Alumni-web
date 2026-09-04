import Box from '@mui/material/Box';
import { useState } from 'react';

import { PlayerControlsOverlay, type PlaybackState } from './PlayerControlsOverlay';
import sample from './sample.json';

export function PlayerControlsOverlayUsage() {
  // In a real player these come from the media engine's events, not from React
  // state — the engine is authoritative for position and playback.
  const [position, setPosition] = useState(sample.positionSeconds);
  const [captionsOn, setCaptionsOn] = useState(sample.captionsOn);

  return (
    <Box sx={{ bgcolor: 'common.black', borderRadius: 1, overflow: 'hidden', pt: 10 }}>
      <PlayerControlsOverlay
        state={sample.state as PlaybackState}
        positionSeconds={position}
        durationSeconds={sample.durationSeconds}
        captionsOn={captionsOn}
        onPlayPause={() => {
          /* engine.play() / engine.pause() */
        }}
        onSeek={setPosition}
        onToggleCaptions={() => {
          setCaptionsOn((current) => !current);
          // Saving the preference is the Action — playback itself is not.
          void fetch('/api/preferences/captions', { method: 'PUT' });
        }}
        onOpenSettings={() => {
          /* audio, subtitles, quality */
        }}
        onCast={() => {
          /* start a cast session */
        }}
        onFullscreen={() => {
          /* requestFullscreen */
        }}
      />
    </Box>
  );
}
