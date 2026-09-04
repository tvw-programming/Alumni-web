import { useState } from 'react';

import { MiniPlayerBar } from './MiniPlayerBar';
import sample from './sample.json';

export function MiniPlayerBarUsage() {
  // Mirrors the media engine; the engine remains authoritative.
  const [playing, setPlaying] = useState(sample.playing);

  return (
    <MiniPlayerBar
      title={sample.title}
      subtitle={sample.subtitle}
      artworkUri={sample.artworkUri}
      playing={playing}
      progressPercent={sample.progressPercent}
      remainingLabel={sample.remainingLabel}
      onPlayPause={() => {
        setPlaying((current) => !current);
      }}
      onExpand={() => {
        /* open the full player */
      }}
      onClose={() => {
        /* stop playback and dismiss */
      }}
    />
  );
}
