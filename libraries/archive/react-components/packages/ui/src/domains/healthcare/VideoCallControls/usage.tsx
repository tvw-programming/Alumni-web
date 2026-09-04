import { useState } from 'react';

import sample from './sample.json';
import { VideoCallControls, type CallQuality } from './VideoCallControls';

export function VideoCallControlsUsage() {
  // Media state is local and immediate. It belongs to the media engine, and a
  // mute that waits for a network hop fails exactly when you need it.
  const [micEnabled, setMicEnabled] = useState(sample.micEnabled);
  const [cameraEnabled, setCameraEnabled] = useState(sample.cameraEnabled);

  return (
    <VideoCallControls
      micEnabled={micEnabled}
      cameraEnabled={cameraEnabled}
      quality={sample.quality as CallQuality}
      elapsedSeconds={sample.elapsedSeconds}
      unreadMessages={sample.unreadMessages}
      onToggleMic={() => {
        setMicEnabled((current) => !current);
        // track.enabled = !micEnabled — applied to the local track first
      }}
      onToggleCamera={() => {
        setCameraEnabled((current) => !current);
      }}
      onOpenChat={() => {
        /* open the in-call chat */
      }}
      onEndCall={() => {
        /* confirm, then tear down the session */
      }}
    />
  );
}
