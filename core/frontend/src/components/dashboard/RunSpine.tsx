import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import Timeline from '@mui/lab/Timeline';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import GavelIcon from '@mui/icons-material/Gavel';
import LaunchIcon from '@mui/icons-material/OpenInNew';
import ReplayIcon from '@mui/icons-material/Replay';
import type { RemediationEdge, RunStep, StepAction } from '../../types/workflow';
import { fonts, kindMeta, statusMeta, tokens } from '../../theme';
import StatusChip from './StatusChip';
import ActionButtons, { isInspectable } from './ActionButtons';

interface Props {
  steps: RunStep[];
  edges: RemediationEdge[];
  onInspect: (step: RunStep) => void;
  onAction: (step: RunStep, action: StepAction) => void;
  busy?: boolean;
}

function duration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

/**
 * The run spine.
 *
 * Ordinary steps sit on the rail as numbered nodes. The two human gates break
 * the rail entirely and render as full-width bars, because that is what they
 * are: structural interruptions that configuration cannot remove, not another
 * node in a sequence. Active remediation edges are drawn as labelled
 * back-references at the step that triggered them.
 */
export default function RunSpine({ steps, edges, onInspect, onAction, busy }: Props) {
  const activeEdge = (step: number) => edges.find((e) => e.from === step && e.loopsUsed > 0);

  return (
    <Timeline
      sx={{
        p: 0,
        m: 0,
        [`& .${timelineItemClasses.root}:before`]: { flex: 0, padding: 0 },
      }}
    >
      {steps.map((step, index) => {
        const meta = statusMeta[step.status];
        const isGate = step.kind === 'GATE';
        const last = index === steps.length - 1;
        const edge = activeEdge(step.step);
        // Nothing has run here yet, so there is nothing to open.
        const inspectable = isInspectable(step);

        if (isGate) {
          return (
            <TimelineItem key={step.step} sx={{ minHeight: 'auto' }}>
              <TimelineSeparator sx={{ display: 'none' }} />
              <TimelineContent sx={{ px: 0, py: 1 }}>
                <Box
                  {...(inspectable
                    ? {
                        onClick: () => onInspect(step),
                        role: 'button',
                        tabIndex: 0,
                        onKeyDown: (e: React.KeyboardEvent) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onInspect(step);
                          }
                        },
                      }
                    : { 'aria-disabled': true })}
                  sx={{
                    cursor: inspectable ? 'pointer' : 'default',
                    opacity: inspectable ? 1 : 0.6,
                    border: `1px solid ${alpha(meta.color, 0.45)}`,
                    borderLeft: `3px solid ${meta.color}`,
                    borderRadius: 1,
                    bgcolor: alpha(meta.color, 0.06),
                    px: 2,
                    py: 1.5,
                    transition: 'background-color 120ms ease',
                    ...(inspectable && { '&:hover': { bgcolor: alpha(meta.color, 0.11) } }),
                    '&:focus-visible': { outline: `2px solid ${meta.color}`, outlineOffset: 2 },
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: "space-between" }}>
                    <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                      <GavelIcon sx={{ fontSize: 18, color: meta.color }} />
                      <Typography
                        sx={{ fontFamily: fonts.mono, fontSize: 13, fontWeight: 600, color: meta.color }}
                      >
                        {String(step.step).padStart(2, '0')}
                      </Typography>
                      <Typography variant="h5" sx={{ color: 'text.primary' }}>
                        {step.title}
                      </Typography>
                      <Chip
                        size="small"
                        label="human gate"
                        sx={{
                          bgcolor: alpha(tokens.signal, 0.12),
                          color: tokens.signal,
                          border: `1px solid ${alpha(tokens.signal, 0.3)}`,
                        }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <StatusChip status={step.status} />
                      <ActionButtons step={step} busy={busy} onAction={(a) => onAction(step, a)} />
                    </Stack>
                  </Stack>

                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    {step.approval?.status === 'APPROVED'
                      ? `Approved by ${step.approval.approverId} (${step.approval.approverRole}) · bound to sha ${step.approval.artifactSha256?.slice(0, 12)}`
                      : step.approval?.comment || 'Waiting for a decision. The run does not continue past this point.'}
                  </Typography>
                </Box>
              </TimelineContent>
            </TimelineItem>
          );
        }

        return (
          <TimelineItem key={step.step} sx={{ minHeight: 62 }}>
            <TimelineSeparator>
              <TimelineDot
                sx={{
                  m: 0,
                  width: 26,
                  height: 26,
                  bgcolor: alpha(meta.color, 0.14),
                  border: `1.5px solid ${meta.color}`,
                  boxShadow: 'none',
                  display: 'grid',
                  placeItems: 'center',
                  ...(step.status === 'RUNNING'
                    ? {
                        animation: 'nodePulse 1.8s ease-in-out infinite',
                        '@keyframes nodePulse': {
                          '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(meta.color, 0.4)}` },
                          '50%': { boxShadow: `0 0 0 6px ${alpha(meta.color, 0)}` },
                        },
                      }
                    : {}),
                }}
              >
                <Typography
                  sx={{ fontFamily: fonts.mono, fontSize: 10, fontWeight: 600, color: meta.color }}
                >
                  {String(step.step).padStart(2, '0')}
                </Typography>
              </TimelineDot>
              {!last && <TimelineConnector sx={{ bgcolor: tokens.rule, width: 1 }} />}
            </TimelineSeparator>

            <TimelineContent sx={{ px: 2, py: 0.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", borderRadius: 1,
                  px: 1.25,
                  py: 0.75,
                  ml: -1.25,
                  transition: 'background-color 120ms ease',
                  '&:hover': { bgcolor: tokens.panelRaised },
                  '&:hover .spine-actions': { opacity: 1 }, }}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "baseline", flexWrap: "wrap" }}>
                    <Typography variant="h6" sx={{ color: 'text.primary' }} noWrap>
                      {step.title}
                    </Typography>
                    <Tooltip title={kindMeta[step.kind].hint}>
                      <Typography
                        component="span"
                        sx={{
                          fontFamily: fonts.mono,
                          fontSize: 10,
                          letterSpacing: '0.1em',
                          color: 'text.secondary',
                          border: `1px solid ${tokens.rule}`,
                          borderRadius: 0.5,
                          px: 0.5,
                          py: 0.1,
                          cursor: 'help',
                        }}
                      >
                        {step.kind}
                      </Typography>
                    </Tooltip>
                    {step.attempt > 1 && (
                      <Typography
                        component="span"
                        sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.signal }}
                      >
                        attempt {step.attempt}
                      </Typography>
                    )}
                  </Stack>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                  >
                    {duration(step.durationMs)}
                    {step.provenance.modelId ? ` · ${step.provenance.modelId}` : ''}
                    {step.provenance.costUsd > 0 ? ` · $${step.provenance.costUsd.toFixed(4)}` : ''}
                  </Typography>

                  {step.error && (
                    <Typography
                      variant="body2"
                      sx={{ color: tokens.fail, mt: 0.5, fontSize: 12.5 }}
                    >
                      {step.error.message}
                    </Typography>
                  )}

                  {edge && (
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", mt: 0.75 }}>
                      <ReplayIcon sx={{ fontSize: 13, color: tokens.signal }} />
                      <Typography
                        sx={{ fontFamily: fonts.mono, fontSize: 11, color: tokens.signal }}
                      >
                        {String(edge.from).padStart(2, '0')} → {String(edge.to).padStart(2, '0')} on{' '}
                        {edge.on} · loop {edge.loopsUsed}/{edge.maxLoops}
                      </Typography>
                    </Stack>
                  )}
                </Box>

                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
                  <StatusChip status={step.status} />
                  <Box
                    className="spine-actions"
                    sx={{ opacity: { xs: 1, md: 0 }, transition: 'opacity 120ms ease' }}
                  >
                    <Tooltip
                      title={inspectable ? 'Inspect input and output' : 'This step has not run yet'}
                    >
                      <span>
                        <IconButton
                          size="small"
                          disabled={!inspectable}
                          onClick={() => onInspect(step)}
                          aria-label={`Inspect step ${step.step}`}
                        >
                          <LaunchIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Stack>
              </Stack>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
}
