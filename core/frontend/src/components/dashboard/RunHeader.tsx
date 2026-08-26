import { Box, Button, Card, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import RestartIcon from '@mui/icons-material/RestartAlt';
import PlayIcon from '@mui/icons-material/PlayArrowRounded';
import FolderIcon from '@mui/icons-material/FolderOpenOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import BlockIcon from '@mui/icons-material/Block';
import type { Run, RunStep } from '../../types/workflow';
import { fonts, statusMeta, tokens } from '../../theme';
import { artifactCount } from '../artifacts/ArtifactsDialog';
import StatusChip from './StatusChip';

interface Props {
  run: Run;
  busy?: boolean;
  /** Re-run the step the run is blocked on, from the beginning. */
  onRetryBlocked: () => void;
  /** The step holding the run up, if any. */
  blockedStep: RunStep | null;
  onJumpToGate: (step: RunStep) => void;
  /** Opens the run-wide artifact reader. Makes the Artifacts tile a control. */
  onOpenArtifacts: () => void;
  /** Begin another run at step 01. */
  onStartRun: () => void;
}

function Metric({
  label,
  value,
  hint,
  accent,
  icon,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  icon?: React.ReactNode;
  /** Present on tiles that open something. The tile then behaves as a button. */
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);

  const body = (
    <Card
      // A tile that opens a dialog is a button, not a div with a handler: it has
      // to take keyboard focus and announce what it does. Spans inside, because
      // a <button> may not contain block elements.
      {...(interactive
        ? { component: 'button' as const, type: 'button' as const, onClick, 'aria-haspopup': 'dialog' as const }
        : {})}
      sx={{
        px: 2,
        py: 1.5,
        height: '100%',
        width: '100%',
        display: 'block',
        textAlign: 'left',
        font: 'inherit',
        borderColor: accent ? alpha(accent, 0.35) : undefined,
        ...(interactive && {
          cursor: 'pointer',
          transition: 'border-color 120ms, background-color 120ms',
          '&:hover': { borderColor: alpha(tokens.signal, 0.55), bgcolor: alpha(tokens.signal, 0.06) },
          '&:focus-visible': { outline: `1px solid ${tokens.signal}`, outlineOffset: 2 },
        }),
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        <Typography component="span" variant="overline" sx={{ color: 'text.secondary', display: 'block' }}>
          {label}
        </Typography>
        {icon}
      </Stack>
      <Typography
        component="span"
        sx={{
          display: 'block',
          fontFamily: fonts.mono,
          fontSize: 20,
          fontWeight: 500,
          lineHeight: 1.3,
          color: accent ?? 'text.primary',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Card>
  );
  return hint ? <Tooltip title={hint}>{body}</Tooltip> : body;
}

export default function RunHeader({
  run,
  busy,
  onRetryBlocked,
  blockedStep,
  onJumpToGate,
  onOpenArtifacts,
  onStartRun,
}: Props) {
  const done = run.steps.filter((s) => s.status === 'SUCCESS' || s.status === 'APPROVED').length;
  const failed = run.steps.filter((s) => s.status === 'FAILED').length;
  const pct = Math.round((done / run.steps.length) * 100);
  const elapsed = Math.max(
    0,
    Math.round((new Date(run.updatedAt).getTime() - new Date(run.startedAt).getTime()) / 1000),
  );
  const openGate = run.steps.find(
    (s) => s.kind === 'GATE' && (s.status === 'AWAITING_APPROVAL' || s.status === 'BLOCKED'),
  );
  const tokensTotal = run.steps.reduce(
    (n, s) => n + s.provenance.tokensIn + s.provenance.tokensOut,
    0,
  );

  // Read the real count off the security scan rather than inferring it from
  // whether anything failed — those are different questions.
  const blockingFindings = run.steps.reduce((n, s) => {
    const output = s.output as { blocking_findings?: unknown[] } | null;
    return n + (Array.isArray(output?.blocking_findings) ? output.blocking_findings.length : 0);
  }, 0);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
        <Box>
          <Stack direction="row" spacing={1.25} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Typography variant="overline" sx={{ color: tokens.signal }}>
              {run.jiraId}
            </Typography>
            <Typography variant="h1" sx={{ color: 'text.primary' }}>
              {run.title}
            </Typography>
          </Stack>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
          >
            job {run.jobId} · profile {run.profile} · started{' '}
            {new Date(run.startedAt).toLocaleString()}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
          {openGate && (
            <Button
              variant="contained"
              startIcon={openGate.status === 'BLOCKED' ? <BlockIcon /> : <GavelIcon />}
              onClick={() => onJumpToGate(openGate)}
              sx={{
                bgcolor: tokens.signal,
                color: '#1A1400',
                '&:hover': { bgcolor: tokens.signal, filter: 'brightness(1.1)' },
              }}
            >
              {openGate.status === 'BLOCKED'
                ? `Gate ${String(openGate.step).padStart(2, '0')} is blocked`
                : `Decide gate ${String(openGate.step).padStart(2, '0')}`}
            </Button>
          )}
          {/* Offered only when something is actually blocked. A retry with
              nothing to retry is a button that does nothing. */}
          {blockedStep && (
            <Button
              variant="outlined"
              startIcon={<RestartIcon />}
              onClick={onRetryBlocked}
              disabled={busy}
              sx={{ color: tokens.fail, borderColor: alpha(tokens.fail, 0.5) }}
            >
              Retry step {String(blockedStep.step).padStart(2, '0')}
            </Button>
          )}
          <Button variant="outlined" startIcon={<PlayIcon />} onClick={onStartRun} disabled={busy}>
            Start a run
          </Button>
        </Stack>
      </Stack>

      {/* A failed step stops everything behind it, so the run says so at the
          top rather than leaving it to be discovered in the step list. */}
      {blockedStep && (
        <Box
          sx={{
            border: `1px solid ${alpha(tokens.fail, 0.4)}`,
            borderLeft: `3px solid ${tokens.fail}`,
            borderRadius: 1,
            bgcolor: alpha(tokens.fail, 0.06),
            px: 2,
            py: 1.25,
          }}
        >
          <Typography variant="body2" sx={{ color: tokens.fail, fontWeight: 600 }}>
            Blocked at step {String(blockedStep.step).padStart(2, '0')} · {blockedStep.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            {blockedStep.error?.message ??
              'This step failed, so nothing after it runs.'}{' '}
            Retry re-runs strictly this step from the beginning; the run continues once it clears.
          </Typography>
        </Box>
      )}

      <Box>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <StatusChip
              status={
                run.status === 'HALTED'
                  ? 'FAILED'
                  : run.status === 'AWAITING_APPROVAL'
                    ? 'AWAITING_APPROVAL'
                    : run.status === 'COMPLETED'
                      ? 'SUCCESS'
                      : 'RUNNING'
              }
            />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {done} of {run.steps.length} steps complete
              {failed > 0 ? ` · ${failed} failed` : ''}
            </Typography>
          </Stack>
          <Typography sx={{ fontFamily: fonts.mono, fontSize: 12, color: 'text.secondary' }}>
            {pct}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            '& .MuiLinearProgress-bar': {
              bgcolor: failed > 0 ? tokens.fail : run.status === 'COMPLETED' ? tokens.pass : tokens.live,
            },
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' },
        }}
      >
        <Metric
          label="Elapsed"
          value={`${Math.floor(elapsed / 60)}m ${String(elapsed % 60).padStart(2, '0')}s`}
        />
        <Metric
          label="Model cost"
          value={`$${run.costUsd.toFixed(4)}`}
          hint={`Budget cap $${run.budgetUsd.toFixed(2)} — the run halts if it is exceeded`}
          accent={run.costUsd > run.budgetUsd * 0.8 ? tokens.signal : undefined}
        />
        <Metric label="Tokens" value={tokensTotal.toLocaleString()} />
        <Metric
          label="Artifacts"
          value={String(artifactCount(run))}
          hint="Open every artifact this run has written, step by step"
          icon={<FolderIcon sx={{ fontSize: 14, color: tokens.signal }} />}
          onClick={onOpenArtifacts}
        />
        <Metric
          label="Blocking findings"
          value={String(blockingFindings)}
          accent={blockingFindings > 0 ? statusMeta.FAILED.color : tokens.pass}
          hint="Findings at or above the configured blocking severity. The merge gate stays shut while any are open."
        />
      </Box>
    </Stack>
  );
}
