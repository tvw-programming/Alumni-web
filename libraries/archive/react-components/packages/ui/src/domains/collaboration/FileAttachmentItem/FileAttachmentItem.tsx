import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import ListItem from '@mui/material/ListItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, timeLabel } from '../../../foundation';

export interface FileAttachment {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  uploadedBy?: string;
  uploadedAt?: string;
  /** 0–100 while uploading; undefined once stored. */
  progress?: number;
  error?: string;
}

export interface FileAttachmentItemProps {
  attachment: FileAttachment;
  onDownload?: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
}

/** `1536000` → `1.5 MB`. Binary units, because that is what file managers show. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

/**
 * A static map, and a function that only picks a key.
 *
 * Returning the component *from* the function reads as creating a component
 * during render, which the React Compiler refuses — and it is right to: a
 * component identity that changes between renders remounts and loses its state.
 */
const ICONS = {
  image: ImageOutlinedIcon,
  pdf: PictureAsPdfIcon,
  file: DescriptionOutlinedIcon,
} as const;

function iconKind(mimeType: string): keyof typeof ICONS {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'file';
}

/**
 * One attachment.
 *
 * The size is always shown. "Download" with no size is how someone on a metered
 * connection ends up pulling a 200 MB video, and it costs one span to prevent.
 *
 * A failed upload keeps its row and offers a retry rather than vanishing — a
 * file that disappears silently is one the user believes was attached.
 */
export function FileAttachmentItem({
  attachment,
  onDownload,
  onRemove,
  onRetry,
}: FileAttachmentItemProps) {
  const Icon = ICONS[iconKind(attachment.mimeType)];
  const uploading = attachment.progress !== undefined;
  const failed = attachment.error !== undefined;

  return (
    <ListItem
      divider
      sx={{ gap: 1.5, opacity: uploading ? 0.8 : 1 }}
      aria-label={describe(
        attachment.name,
        formatBytes(attachment.sizeBytes),
        attachment.uploadedBy ? `added by ${attachment.uploadedBy}` : undefined,
        attachment.uploadedAt ? timeLabel(attachment.uploadedAt) : undefined,
        uploading ? `uploading, ${String(attachment.progress)} percent` : undefined,
        attachment.error,
      )}
      secondaryAction={
        <Stack direction="row" spacing={0.5}>
          {failed && onRetry ? (
            <IconButton
              size="small"
              aria-label={`Retry uploading ${attachment.name}`}
              onClick={onRetry}
            >
              <DownloadIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} />
            </IconButton>
          ) : null}
          {onDownload && !uploading && !failed ? (
            <IconButton
              size="small"
              aria-label={`Download ${attachment.name}, ${formatBytes(attachment.sizeBytes)}`}
              onClick={onDownload}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          ) : null}
          {onRemove ? (
            <IconButton size="small" aria-label={`Remove ${attachment.name}`} onClick={onRemove}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Stack>
      }
    >
      <Icon color={failed ? 'error' : 'action'} />

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap aria-hidden>
          {attachment.name}
        </Typography>
        <Typography variant="caption" color={failed ? 'error.main' : 'text.secondary'} aria-hidden>
          {failed
            ? attachment.error
            : [
                formatBytes(attachment.sizeBytes),
                attachment.uploadedBy,
                attachment.uploadedAt ? timeLabel(attachment.uploadedAt).split(' (')[0] : null,
              ]
                .filter(Boolean)
                .join(' · ')}
        </Typography>

        {uploading ? (
          <LinearProgress
            variant="determinate"
            value={attachment.progress}
            sx={{ mt: 0.5, height: 3, borderRadius: 2 }}
            aria-hidden
          />
        ) : null}
      </Box>
    </ListItem>
  );
}
