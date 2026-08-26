# FileAttachmentItem

## API

```ts
type FileAttachmentItemProps = {
  attachment: FileAttachment; // name, sizeBytes, mimeType, uploadedBy?, uploadedAt?, progress?, error?
  onDownload?: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
};
```

## The size is always shown

"Download" with no size is how someone on a metered connection pulls a 200 MB
video by accident. It costs one span to prevent, and the download button repeats
it in its label: _"Download offsite-plan-v4.pdf, 2.3 MB"_.

## A failed upload keeps its row

With a retry. A file that vanishes silently is one the user believes was
attached — and they find out when the recipient asks for it.

## States

uploading (progress bar, 80% opacity) · stored (size, uploader, time) · failed
(red icon, the error in place of the metadata, retry).
