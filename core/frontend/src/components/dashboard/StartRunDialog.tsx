import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayIcon from '@mui/icons-material/PlayArrowRounded';
import type { NewRunRequest } from '../../types/workflow';
import { fonts, tokens } from '../../theme';
import { rememberApprover, storedApprover } from '../../lib/approver';

interface Props {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  /** Resolves once the orchestrator has accepted the run; rejects with why not. */
  onStart: (request: NewRunRequest) => Promise<void>;
}

/**
 * Starting a run, at step 01.
 *
 * Nothing else starts one: no schedule, no webhook, no boot-time seed. A
 * developer types the story in and presses a button, which is the point — the
 * pipeline writes code against whatever it is told here, and that decision
 * belongs to a person who is present.
 *
 * The form asks for what step 01 would otherwise fetch from the tracker, and
 * declining it says exactly that: go and fetch it. Acceptance criteria are not
 * optional in either case, because steps 05, 07, 13 and 23 all trace to their
 * ids — a story without them cannot be verified later, so it is refused now
 * rather than four steps in.
 *
 * Closing the dialog without finishing it — Cancel, the X, Escape, the
 * backdrop — is not an abort as long as a story number has been typed: it
 * starts the run anyway, using the tracker for whatever wasn't filled in.
 * "Declining to provide the details" and "walking away from the dialog" are
 * the same gesture, so they get the same outcome. An empty story number is
 * the one case with nothing to fall back to, and stays a true abort.
 */
export default function StartRunDialog({ open, busy, onClose, onStart }: Props) {
  const [jiraId, setJiraId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [criteria, setCriteria] = useState('');
  const [useTracker, setUseTracker] = useState(false);
  const [startedBy, setStartedBy] = useState(storedApprover);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setError(null);
      setSending(false);
      setStartedBy(storedApprover());
    }
  }, [open]);

  const lines = criteria
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean);

  /** Whatever's typed is enough to submit on its own, tracker fetch or not. */
  const complete = useTracker || (title.trim().length > 0 && lines.length > 0);

  async function start(request: Omit<NewRunRequest, 'startedBy'>): Promise<void> {
    setSending(true);
    setError(null);
    try {
      const named = startedBy.trim();
      if (named) rememberApprover(named);
      // No 'dashboard-user' fallback: a deployment that pushes branches refuses
      // the run rather than authoring commits as nobody, and the error it
      // returns is clearer than a placeholder that fails later.
      await onStart({ ...request, startedBy: named });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That run could not be started.');
    } finally {
      setSending(false);
    }
  }

  /** Loose on purpose: the orchestrator decides, this only catches typos. */
  function isEmail(value: string): boolean {
    return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value.trim());
  }

  async function submit(): Promise<void> {
    const key = jiraId.trim();
    if (!key) {
      setError('A story number is required — it is what the run is filed under.');
      return;
    }
    if (!complete) {
      setError(
        'A title and at least one acceptance criterion are required. Every later step traces ' +
          'back to a criterion id. Switch to the tracker if you would rather it fetched them.',
      );
      return;
    }
    await start({ jiraId: key, title: title.trim(), description, acceptanceCriteria: lines, useTracker });
  }

  /**
   * Cancel, the X, Escape, and the backdrop all land here. A story number with
   * nothing else typed falls back to the tracker; a story number with a
   * complete form typed in is submitted as-is rather than thrown away; no
   * story number at all has nothing to start, so it's a plain close.
   */
  async function decline(): Promise<void> {
    const key = jiraId.trim();
    if (!key) {
      onClose();
      return;
    }
    if (complete) {
      await start({ jiraId: key, title: title.trim(), description, acceptanceCriteria: lines, useTracker });
    } else {
      await start({ jiraId: key, title: '', description: '', acceptanceCriteria: [], useTracker: true });
    }
  }

  const working = sending || busy;

  return (
    <Dialog
      open={open}
      onClose={working ? undefined : () => void decline()}
      maxWidth="sm"
      fullWidth
      aria-labelledby="start-run-title"
      slotProps={{ paper: { sx: { bgcolor: tokens.panel } } }}
    >
      <DialogTitle id="start-run-title" sx={{ pr: 6 }}>
        <Typography variant="h4" component="span" sx={{ display: 'block' }}>
          Start a run
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Twenty-four steps, beginning at step 01 with the story below and stopping at the BRD gate
          for your approval. Nothing runs until you press start.
        </Typography>
        <IconButton
          onClick={() => void decline()}
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
          <TextField
            autoFocus
            size="small"
            label="Jira story number"
            placeholder="DEEP-2042"
            required
            value={jiraId}
            onChange={(e) => setJiraId(e.target.value)}
            disabled={working}
            slotProps={{ input: { sx: { fontFamily: fonts.mono } } }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={useTracker}
                onChange={(e) => setUseTracker(e.target.checked)}
                disabled={working}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Skip the details and fetch the story from the configured tracker
              </Typography>
            }
          />

          {/* Kept mounted rather than unmounted, so switching back does not
              discard what the developer already typed. */}
          <Box sx={{ display: useTracker ? 'none' : 'block' }}>
            <Stack spacing={2}>
              <TextField
                size="small"
                label="Story title"
                placeholder="Let users export their own data"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={working}
                fullWidth
              />
              <TextField
                size="small"
                label="Description"
                multiline
                minRows={3}
                placeholder="What the change is for, and for whom."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={working}
                fullWidth
              />
              <TextField
                size="small"
                label="Acceptance criteria"
                multiline
                minRows={3}
                placeholder={'AC-1 An owner can export their own data\nAC-2 A request for another account is refused'}
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                disabled={working}
                helperText={`One per line. ${lines.length} so far — every later step traces to their ids.`}
                fullWidth
              />
            </Stack>
          </Box>

          <TextField
            size="small"
            type="email"
            label="Your email"
            placeholder="firstname.lastname@example.com"
            value={startedBy}
            onChange={(e) => setStartedBy(e.target.value)}
            disabled={working}
            error={startedBy.trim().length > 0 && !isEmail(startedBy)}
            // An address rather than a name because step 22 authors this run's
            // commits as this person, and git has nowhere to put a bare name.
            helperText="Recorded against the run, and used to author its commits"
          />

          {error && (
            <Alert severity="error" variant="outlined" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Only relevant once there's a story number to fall back with — an
              empty dialog closing is not a surprise worth explaining. */}
          {jiraId.trim() && !complete && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Leaving this without finishing the form starts a run anyway, using the tracker for
              anything you didn't fill in.
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={() => void decline()} disabled={working} sx={{ color: 'text.secondary' }}>
          {jiraId.trim() ? 'Skip & start' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={working || !jiraId.trim()}
          startIcon={<PlayIcon />}
          sx={{
            bgcolor: tokens.signal,
            color: '#1A1400',
            '&:hover': { bgcolor: tokens.signal, filter: 'brightness(1.1)' },
          }}
        >
          {sending ? 'Starting…' : 'Start at step 01'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
