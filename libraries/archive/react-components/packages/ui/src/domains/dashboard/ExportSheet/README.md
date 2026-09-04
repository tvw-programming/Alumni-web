# ExportSheet

Choose format and scope _before_ generating.

## API

```ts
type ExportSheetProps = {
  open: boolean;
  viewCount: number;
  totalCount: number;
  state: ExportState;
  onClose: () => void;
  onGenerate: (request: ExportRequest) => Promise<string>; // resolves with a job id
  onDownload?: (downloadId: string) => void;
};

type ExportState =
  | { status: 'idle' }
  | { status: 'generating'; jobId: string; progress?: number }
  | { status: 'ready'; downloadId: string }
  | { status: 'error'; message: string };
```

## The rule

**A file is not "ready" until the export service says so.** Optimism is only
permissible once the backend returns a durable job id — before that there is
nothing to be optimistic about, and a Download button that appears on click
hands the user a 404.

## Both counts, against the scope choice

"Current view (128)" and "All records (42,910)". "Export all" meaning 128 rows or
1.2 million is the difference between a click and a five-minute wait.

## React 19

`useActionState` for generation. Because the job is durable, the dialog can be
closed while it runs — and it says so: _"You can close this — we will keep
working."_
