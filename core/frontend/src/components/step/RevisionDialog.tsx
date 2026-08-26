import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import UploadIcon from '@mui/icons-material/UploadFileOutlined';
import DescriptionIcon from '@mui/icons-material/InsertDriveFileOutlined';
import type { RunStep } from '../../types/workflow';
import type { RevisionUpload } from '../../api/client';
import { fonts, tokens } from '../../theme';
import { rememberApprover, storedApprover } from '../../lib/approver';
import { bytes as humanBytes } from './ArtifactRow';

interface Props {
  /** The gate being answered. Null while the dialog has never been opened. */
  step: RunStep | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  /** Resolves when the orchestrator has accepted the document; rejects with why not. */
  onSubmit: (upload: RevisionUpload) => Promise<void>;
}

/**
 * What the gate calls the thing it is reviewing.
 *
 * Taken from the artifact under review — `05_brd__JOB__v1.md` is a BRD — so a
 * gate over some other document names that instead. The dashboard is not
 * supposed to know that step 06 is about BRDs; the run tells it.
 */
export function documentLabel(step: RunStep | null): string {
  const file = step?.reviewArtifacts?.[0]?.file ?? '';
  const slug = file.replace(/^\d+_/, '').split('__')[0].replace(/[_-]+/g, ' ').trim();
  if (!slug) return 'document';
  return slug.length <= 4 ? slug.toUpperCase() : slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** Bytes to base64, in chunks — a spread of a whole file overflows the stack. */
function toBase64(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  const size = 0x8000;
  let binary = '';
  for (let i = 0; i < view.length; i += size) {
    binary += String.fromCharCode(...view.subarray(i, i + size));
  }
  return btoa(binary);
}

function extensionOf(name: string): string {
  return name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
}

/**
 * Replace the document a gate rejected.
 *
 * The gate is the only way past this point in the run, and it has just been
 * told the document is wrong. So this dialog is not a file picker with a submit
 * button: it says what the upload will do — supersede the artifact under
 * review, re-open the gate against the new checksum — and collects the name and
 * role that go into the audit record, because a document that reshapes what the
 * pipeline builds is as consequential as the decision that accepted it.
 */
export default function RevisionDialog({ step, open, busy, onClose, onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [approver, setApprover] = useState(storedApprover);
  const [role, setRole] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setError(null);
      setComment('');
      setSending(false);
      setDragging(false);
      setApprover(storedApprover());
      setRole(step?.requiredRoles?.[0] ?? '');
    }
  }, [open, step?.step]);

  if (!step?.revision) return null;

  const { acceptedExtensions, maxBytes, revisionsUsed, maxRevisions, replacesStep } = step.revision;
  const label = documentLabel(step);
  const accept = acceptedExtensions.map((e) => `.${e}`).join(',');
  const replaced = step.reviewArtifacts?.[0]?.file;

  /** Refuse locally what the gate would refuse anyway, before the round trip. */
  function check(candidate: File): string | null {
    const ext = extensionOf(candidate.name);
    if (!acceptedExtensions.includes(ext)) {
      return `${candidate.name} is not a ${accept} file. This gate reads ${acceptedExtensions
        .map((e) => `.${e}`)
        .join(', ')}.`;
    }
    if (candidate.size === 0) return `${candidate.name} is empty.`;
    if (candidate.size > maxBytes) {
      return `${candidate.name} is ${humanBytes(candidate.size)}; the limit is ${humanBytes(maxBytes)}.`;
    }
    return null;
  }

  function choose(candidate: File | undefined): void {
    if (!candidate) return;
    const problem = check(candidate);
    setError(problem);
    setFile(problem ? null : candidate);
  }

  async function submit(): Promise<void> {
    if (!file) return;
    const named = approver.trim();
    if (!named) {
      setError('Add your name. The orchestrator records who replaced the document.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      rememberApprover(named);
      await onSubmit({
        filename: file.name,
        contentBase64: toBase64(await file.arrayBuffer()),
        uploadedBy: named,
        uploadedRole: role,
        comment,
      });
    } catch (err) {
      // Kept in the dialog rather than raised to the page: the person holding
      // the file is the person who can fix what is wrong with it.
      setError(err instanceof Error ? err.message : 'That document could not be accepted.');
    } finally {
      setSending(false);
    }
  }

  const working = sending || busy;

  return (
    <Dialog
      open={open}
      onClose={working ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="revision-dialog-title"
      slotProps={{ paper: { sx: { bgcolor: tokens.panel } } }}
    >
      <DialogTitle id="revision-dialog-title" sx={{ pr: 6 }}>
        <Typography variant="h4" component="span" sx={{ display: 'block' }}>
          Upload an updated {label}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Gate {String(step.step).padStart(2, '0')} was rejected, so the run is stopped. The
          document you upload replaces the step {String(replacesStep).padStart(2, '0')} output, and
          the gate re-opens bound to its checksum — nothing past the gate runs until you decide
          again.
        </Typography>
        <IconButton
          onClick={onClose}
          disabled={working}
          size="small"
          aria-label="Close"
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {replaced && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: fonts.mono }}>
              replacing {replaced}
            </Typography>
          )}

          {/* The drop zone is also a button, so the dialog is usable without a
              pointer — dragging is the shortcut, not the mechanism. */}
          <Box
            component="button"
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e: React.DragEvent) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e: React.DragEvent) => {
              e.preventDefault();
              setDragging(false);
              choose(e.dataTransfer.files?.[0]);
            }}
            disabled={working}
            aria-label={`Choose a replacement ${label}`}
            sx={{
              font: 'inherit',
              width: '100%',
              cursor: working ? 'default' : 'pointer',
              display: 'grid',
              placeItems: 'center',
              gap: 0.75,
              px: 2,
              py: 3.5,
              borderRadius: 1,
              border: `1px dashed ${dragging ? tokens.signal : tokens.ruleStrong}`,
              bgcolor: dragging ? alpha(tokens.signal, 0.08) : 'transparent',
              color: 'text.primary',
              '&:hover': { borderColor: tokens.signal },
              '&:focus-visible': { outline: `2px solid ${tokens.signal}`, outlineOffset: 2 },
            }}
          >
            {file ? (
              <>
                <DescriptionIcon sx={{ fontSize: 22, color: tokens.pass }} />
                <Typography sx={{ fontFamily: fonts.mono, fontSize: 13 }}>{file.name}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {humanBytes(file.size)} · click to choose a different file
                </Typography>
              </>
            ) : (
              <>
                <UploadIcon sx={{ fontSize: 22, color: tokens.signal }} />
                <Typography sx={{ fontSize: 13.5 }}>
                  Drop the {label} here, or click to choose a file
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {acceptedExtensions.map((e) => `.${e}`).join(', ')} · up to {humanBytes(maxBytes)}
                </Typography>
              </>
            )}
          </Box>
          <input
            ref={input}
            type="file"
            accept={accept}
            hidden
            onChange={(e) => choose(e.target.files?.[0])}
          />

          <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="Your name"
              placeholder="firstname.lastname"
              value={approver}
              onChange={(e) => setApprover(e.target.value)}
              disabled={working}
              sx={{ minWidth: 200, flex: 1 }}
            />
            <TextField
              select={(step.requiredRoles?.length ?? 0) > 1}
              size="small"
              label="Uploading as"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={working || (step.requiredRoles?.length ?? 0) <= 1}
              helperText="Replacing the document is bound by the roles that may decide the gate"
              sx={{ minWidth: 200, flex: 1 }}
            >
              {(step.requiredRoles ?? []).map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            fullWidth
            size="small"
            multiline
            minRows={2}
            disabled={working}
            placeholder="What changed? (goes into the audit record)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          {error && (
            <Alert severity="error" variant="outlined" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {revisionsUsed} of {maxRevisions} replacements used. The document must carry acceptance
            criteria: every downstream step traces to their ids.
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={working} sx={{ color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={!file || working}
          startIcon={<UploadIcon sx={{ fontSize: 16 }} />}
          sx={{
            bgcolor: tokens.signal,
            color: '#1A1400',
            '&:hover': { bgcolor: tokens.signal, filter: 'brightness(1.1)' },
          }}
        >
          {sending ? 'Uploading…' : 'Replace and re-open gate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
