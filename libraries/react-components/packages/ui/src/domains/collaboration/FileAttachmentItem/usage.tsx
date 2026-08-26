import List from '@mui/material/List';

import { FileAttachmentItem, type FileAttachment } from './FileAttachmentItem';
import sample from './sample.json';

export function FileAttachmentItemUsage() {
  const attachment = sample.attachment as FileAttachment;

  return (
    <List disablePadding>
      <FileAttachmentItem
        attachment={attachment}
        onDownload={() => {
          window.location.href = `/api/attachments/${attachment.id}`;
        }}
        onRemove={() => {
          /* confirm first — removal is destructive */
        }}
      />
    </List>
  );
}
