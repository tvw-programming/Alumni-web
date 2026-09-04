# DownloadStatusButton

## API

```ts
type DownloadStatusButtonProps = {
  title: string;
  state: 'notDownloaded' | 'queued' | 'downloading' | 'paused' | 'complete'
       | 'failed' | 'expired' | 'unavailable';
  progressPercent?: number;
  sizeLabel?: string;          // shown before starting
  expiresInLabel?: string;     // shown after finishing
  unavailableReason?: string;
  onStart / onPause? / onResume? / onRemove?
};
```

## Eight states, because a download has eight

`expired` is the one specific to licensed media: a file the user still has on
disk but may no longer play. Collapsing it into "not downloaded" makes the app
look like it lost their file — so it says **"Renew to watch offline again."**

## Size before, expiry after

A download that silently consumes 3.4 GB on a metered connection is a complaint,
and often a refund. "Expires in 29 days" answers the question people ask about
offline content.

## React 19

Actions start and stop the transfer. **The progress belongs to the download
manager**, which survives the app being backgrounded — React 19 does not replace
a download manager or a billing SDK.

## Accessibility

The button's label names the command _and_ the title: "Pause download of Dune:
Part Two, 3.4 GB · HD". A list of episodes otherwise gives twenty identical
buttons.
