import { DownloadStatusButton, type DownloadState } from './DownloadStatusButton';
import sample from './sample.json';

export function DownloadStatusButtonUsage() {
  return (
    <DownloadStatusButton
      title={sample.title}
      state={sample.state as DownloadState}
      progressPercent={sample.progressPercent}
      sizeLabel={sample.sizeLabel}
      expiresInLabel={sample.expiresInLabel}
      // The Actions start and stop the transfer. Progress comes from the
      // download manager, which keeps running when the app is backgrounded —
      // React 19 does not replace it.
      onStart={async () => {
        await fetch('/api/downloads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentId: 'cnt_dune2', quality: 'hd' }),
        });
      }}
      onPause={async () => {
        await fetch('/api/downloads/cnt_dune2/pause', { method: 'POST' });
      }}
      onResume={async () => {
        await fetch('/api/downloads/cnt_dune2/resume', { method: 'POST' });
      }}
      onRemove={async () => {
        await fetch('/api/downloads/cnt_dune2', { method: 'DELETE' });
      }}
    />
  );
}
