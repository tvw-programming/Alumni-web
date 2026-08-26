import {
  MeditationPlayerCard,
  type MeditationSession,
  type SessionPlayback,
} from './MeditationPlayerCard';
import sample from './sample.json';

export function MeditationPlayerCardUsage() {
  const session = sample.session as MeditationSession;

  return (
    <MeditationPlayerCard
      session={session}
      // Playback comes from a shared audio-session controller, so background
      // audio, route changes and the lock screen keep working.
      playback={sample.playback as SessionPlayback}
      sleepTimerLabel={sample.sleepTimerLabel}
      onPlayPause={() => {
        /* audioSession.toggle(session.id) */
      }}
      onToggleFavourite={async (next) => {
        const response = await fetch(`/api/meditation/${session.id}/favourite`, {
          method: next ? 'PUT' : 'DELETE',
        });
        if (!response.ok) throw await response.json();
      }}
      onSetSleepTimer={() => {
        /* audioSession.stopAfter(minutes) */
      }}
      onDownload={async () => {
        await fetch(`/api/meditation/${session.id}/download`, { method: 'POST' });
      }}
    />
  );
}
