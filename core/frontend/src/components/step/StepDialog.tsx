import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SouthIcon from '@mui/icons-material/SouthEast';
import NorthIcon from '@mui/icons-material/NorthEast';
import DescriptionIcon from '@mui/icons-material/InsertDriveFileOutlined';
import type { RunStep, StepAction } from '../../types/workflow';
import type { DecisionOptions } from '../../hooks/useRun';
import { fonts, kindMeta, statusMeta, tokens } from '../../theme';
import StatusChip from '../dashboard/StatusChip';
import ActionButtons, { awaitingDocument } from '../dashboard/ActionButtons';
import { rememberApprover, storedApprover } from '../../lib/approver';
import ArtifactRow, { defaultArtifact } from './ArtifactRow';
import ArtifactView from './ArtifactView';
import JsonView from './JsonView';

interface Props {
  step: RunStep | null;
  open: boolean;
  onClose: () => void;
  onAction: (step: RunStep, action: StepAction, decision?: DecisionOptions) => void;
  busy?: boolean;
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Typography
        sx={{ fontFamily: fonts.mono, fontSize: 12.5, color: 'text.primary', wordBreak: 'break-all' }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function StepDialog({ step, open, onClose, onAction, busy }: Props) {
  // A gate is a decision about a document, so it opens on the document (tab 2)
  // rather than on the request that named it. Set on the first render as well as
  // on reopen, or a gate flashes the Input tab before the effect corrects it.
  const [tab, setTab] = useState(() => (step?.kind === 'GATE' ? 2 : 0));
  const [comment, setComment] = useState('');
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [approver, setApprover] = useState(storedApprover);

  useEffect(() => {
    if (open) {
      setTab(step?.kind === 'GATE' ? 2 : 0);
      setComment('');
      setOpenFile(null);
      setRole(step?.requiredRoles?.[0] ?? '');
      setApprover(storedApprover());
    }
  }, [open, step?.step, step?.kind]);

  if (!step) return null;
  const meta = statusMeta[step.status];
  const isGate = step.kind === 'GATE';
  const roles = step.requiredRoles ?? [];
  const decidable = isGate && (step.status === 'AWAITING_APPROVAL' || step.status === 'PENDING');

  // A gate writes only its own decision record, so the document under review
  // belongs to an earlier step. Reading it is the whole point of the gate, so
  // it is listed here, ahead of whatever the gate itself wrote.
  const own = step.artifacts;
  const review = (step.reviewArtifacts ?? []).filter((r) => !own.some((o) => o.file === r.file));
  const files = [...review, ...own];

  // Derived rather than stored, so the refresh poll — which hands us new
  // artifact objects every time — cannot reset the reviewer's selection or
  // strand it on a filename that is no longer in the run.
  const chosen = openFile && files.some((a) => a.file === openFile) ? openFile : defaultArtifact(files);
  const shown = files.find((a) => a.file === chosen) ?? null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      // No breakpoint cap: a BRD, a diff and a rendered PDF all read better with
      // the whole window than inside a centred column.
      maxWidth={false}
      fullWidth
      scroll="paper"
      aria-labelledby="step-dialog-title"
      slotProps={{
        paper: { sx: { bgcolor: tokens.panel, width: '100%', maxWidth: 'none', m: 2, maxHeight: '94vh' } },
      }}
    >
      <DialogTitle id="step-dialog-title" sx={{ p: 0 }}>
        <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${tokens.rule}` }}>
          <Stack direction="row" spacing={2} sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1.25} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Typography
                  sx={{
                    fontFamily: fonts.mono,
                    fontSize: 13,
                    fontWeight: 600,
                    color: meta.color,
                    border: `1px solid ${alpha(meta.color, 0.4)}`,
                    borderRadius: 0.75,
                    px: 0.75,
                    py: 0.1,
                  }}
                >
                  {String(step.step).padStart(2, '0')}
                </Typography>
                <Typography variant="h2" sx={{ color: 'text.primary' }}>
                  {step.title}
                </Typography>
                <StatusChip status={step.status} />
              </Stack>
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>
                <Tooltip title={kindMeta[step.kind].hint}>
                  <Chip
                    size="small"
                    label={kindMeta[step.kind].label}
                    sx={{ bgcolor: tokens.panelRaised, border: `1px solid ${tokens.rule}` }}
                  />
                </Tooltip>
                <Chip
                  size="small"
                  label={step.category}
                  sx={{ bgcolor: 'transparent', border: `1px solid ${tokens.rule}`, color: 'text.secondary' }}
                />
                {step.capability && (
                  <Chip
                    size="small"
                    label={`capability: ${step.capability}`}
                    sx={{ bgcolor: 'transparent', border: `1px solid ${tokens.rule}`, color: 'text.secondary' }}
                  />
                )}
              </Stack>
            </Box>
            <IconButton onClick={onClose} size="small" aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5, maxWidth: '68ch' }}>
            {step.rationale}
          </Typography>
        </Box>
      </DialogTitle>

      <Box sx={{ borderBottom: `1px solid ${tokens.rule}`, px: 2 }}>
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          <Tab icon={<SouthIcon sx={{ fontSize: 15 }} />} iconPosition="start" label="Input" />
          <Tab icon={<NorthIcon sx={{ fontSize: 15 }} />} iconPosition="start" label="Output" />
          <Tab icon={<DescriptionIcon sx={{ fontSize: 15 }} />} iconPosition="start" label={`Artifacts (${files.length})`} />
          <Tab label="Provenance" />
        </Tabs>
      </Box>

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {step.error && (
          <Alert
            severity={step.status === 'BLOCKED' ? 'warning' : 'error'}
            variant="outlined"
            sx={{ mb: 2.5, borderColor: alpha(meta.color, 0.4), '& .MuiAlert-message': { width: '100%' } }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: step.error.detail ? 0.5 : 0 }}>
              {step.error.message}
            </Typography>
            {step.error.detail && (
              <Typography
                variant="body2"
                sx={{ fontFamily: fonts.mono, fontSize: 12, color: 'text.secondary', whiteSpace: 'pre-wrap' }}
              >
                {step.error.detail}
              </Typography>
            )}
          </Alert>
        )}

        {tab === 0 && (
          <Stack spacing={1.5}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              What this step received.
              {step.consumes.length > 0 && ` Declared inputs: ${step.consumes.join(', ')}.`}
            </Typography>
            <JsonView value={step.input} emptyMessage="This step has not run, so it has no input yet." />
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={1.5}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              What this step produced.
              {step.produces.length > 0 && ` Declared outputs: ${step.produces.join(', ')}.`}
            </Typography>
            <JsonView value={step.output} emptyMessage="This step has not produced output yet." />
          </Stack>
        )}

        {tab === 2 && (
          <Stack spacing={1}>
            {files.length === 0 ? (
              <Box sx={{ border: `1px dashed ${tokens.rule}`, borderRadius: 1, p: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No artifacts written yet.
                </Typography>
              </Box>
            ) : (
              <>
                {review.length > 0 && (
                  <Typography variant="overline" sx={{ color: tokens.signal }}>
                    Under review at this gate
                  </Typography>
                )}
                {review.map((a) => (
                  <ArtifactRow
                    key={a.file}
                    artifact={a}
                    active={a.file === chosen}
                    onSelect={() => setOpenFile(a.file)}
                  />
                ))}

                {review.length > 0 && own.length > 0 && (
                  <Typography variant="overline" sx={{ color: 'text.secondary', pt: 1 }}>
                    Written by this step
                  </Typography>
                )}
                {own.map((a) => (
                  <ArtifactRow
                    key={a.file}
                    artifact={a}
                    active={a.file === chosen}
                    onSelect={() => setOpenFile(a.file)}
                  />
                ))}

                {shown && <ArtifactView key={shown.file} artifact={shown} />}
              </>
            )}
          </Stack>
        )}

        {tab === 3 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
              gap: 2.5,
              border: `1px solid ${tokens.rule}`,
              borderRadius: 1,
              p: 2,
            }}
          >
            <Meta label="Backend" value={step.provenance.backendId ?? '—'} />
            <Meta label="Model" value={step.provenance.modelId ?? 'no model — deterministic'} />
            <Meta label="Attempt" value={step.attempt} />
            <Meta label="Tokens in" value={step.provenance.tokensIn.toLocaleString()} />
            <Meta label="Tokens out" value={step.provenance.tokensOut.toLocaleString()} />
            <Meta label="Cost" value={`$${step.provenance.costUsd.toFixed(4)}`} />
            <Meta label="Started" value={step.startedAt ? new Date(step.startedAt).toLocaleTimeString() : '—'} />
            <Meta
              label="Duration"
              value={step.durationMs === null ? '—' : `${(step.durationMs / 1000).toFixed(1)}s`}
            />
            <Meta label="Prompt sha" value={step.provenance.promptSha256?.slice(0, 16) ?? '—'} />
          </Box>
        )}
      </DialogContent>

      <Divider />
      <Box sx={{ px: 3, py: 2 }}>
        {/* A rejected gate that takes a replacement has one way forward, and the
            reviewer is looking at the document they turned down. Say what the
            control does before they hunt for an Approve button that is gone. */}
        {awaitingDocument(step) && (
          <Alert
            severity="warning"
            variant="outlined"
            icon={<DescriptionIcon fontSize="small" />}
            sx={{ mb: 2, borderColor: alpha(tokens.signal, 0.4) }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              This gate is waiting for a replacement document.
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              The run is stopped and step {String(step.revision?.replacesStep).padStart(2, '0')}{' '}
              will not be re-run: the same inputs produce the same document. Rerun opens the upload,
              and the new file supersedes this one and re-opens the gate.
              {step.revision ? ` ${step.revision.revisionsUsed} of ${step.revision.maxRevisions} replacements used.` : ''}
            </Typography>
          </Alert>
        )}
        {step.revision?.lastRevision && (
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1.5 }}>
            Under review: {step.revision.lastRevision.file}, uploaded by{' '}
            {step.revision.lastRevision.uploadedBy} ({step.revision.lastRevision.uploadedRole}).
          </Typography>
        )}
        {decidable && (
          <Stack spacing={2} sx={{ mb: 2 }}>
            {/* The gate accepts a decision only from a role it lists, and the
                journal records the name against the artifact checksum, so both
                are collected here rather than defaulted silently. */}
            <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <TextField
                size="small"
                label="Your name"
                placeholder="firstname.lastname"
                value={approver}
                onChange={(e) => setApprover(e.target.value)}
                sx={{ minWidth: 220, flex: 1 }}
              />
              <TextField
                select={roles.length > 1}
                size="small"
                label="Deciding as"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={roles.length <= 1}
                helperText={
                  roles.length > 1
                    ? `This gate accepts ${roles.join(' or ')}`
                    : 'The only role this gate accepts'
                }
                sx={{ minWidth: 220, flex: 1 }}
              >
                {roles.map((r) => (
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
              placeholder="Add a note for the audit record (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Stack>
        )}
        <Stack direction="row" spacing={2} useFlexGap sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {isGate && step.requiredRoles
              ? `Requires one of: ${step.requiredRoles.join(', ')}`
              : `${step.kind.toLowerCase()} · ${step.category}`}
          </Typography>
          <ActionButtons
            step={step}
            busy={busy}
            showAll
            size="medium"
            onAction={(action) => {
              const named = approver.trim();
              if (named) rememberApprover(named);
              onAction(step, action, {
                comment,
                role: role || undefined,
                approver: named || undefined,
              });
            }}
          />
        </Stack>
      </Box>
    </Dialog>
  );
}
