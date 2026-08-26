import { Button, IconButton, Stack, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/CheckCircleOutlined';
import CloseIcon from '@mui/icons-material/HighlightOff';
import ReplayIcon from '@mui/icons-material/Replay';
import RestartIcon from '@mui/icons-material/RestartAlt';
import type { RunStep, StepAction } from '../../types/workflow';
import { tokens } from '../../theme';

interface Props {
  step: RunStep;
  onAction: (action: StepAction) => void;
  busy?: boolean;
  size?: 'small' | 'medium';
  /** Show every control, disabled where it does not apply. */
  showAll?: boolean;
  /**
   * Icon-only controls, for places with no room for labels — the truck cards in
   * the visual route. The label survives as the tooltip and the accessible name,
   * so what the control does is still announced.
   */
  compact?: boolean;
}

/**
 * Whether a step has anything to show.
 *
 * A step that has not run holds no input, no output, no artifacts and no
 * provenance, so opening it presents an empty dialog and reads as a bug. Every
 * view asks this one question rather than each deciding for itself.
 */
export function isInspectable(step: RunStep): boolean {
  return step.status !== 'PENDING' && step.status !== 'SKIPPED';
}

/**
 * Is this gate waiting for a replacement document rather than for a decision?
 *
 * A rejected BRD gate has nowhere to go: re-running step 05 on the same inputs
 * writes the same document. The gate says so itself — the orchestrator sets
 * `revision.required` — and every view asks this one question rather than
 * hard-coding which step number happens to be a BRD.
 */
export function awaitingDocument(step: RunStep): boolean {
  return step.revision?.required === true;
}

/**
 * Which controls a step offers depends on what it is waiting for.
 *
 * A gate awaiting a decision offers Approve and Reject; anything that finished
 * badly offers Rerun. A rejected gate that accepts a replacement document is
 * the one case where those swap over: the decision pair disappears, because
 * there is nothing new to decide until a different document arrives, and Rerun
 * is left standing as the way forward. Disabled controls carry a tooltip
 * saying why.
 */
export function availableActions(step: RunStep): Record<StepAction, { enabled: boolean; reason: string }> {
  const isGate = step.kind === 'GATE';
  const owed = awaitingDocument(step);
  const spent = step.revision?.exhausted === true;
  const decidable = isGate && !owed && !spent && (step.status === 'AWAITING_APPROVAL' || step.status === 'PENDING');
  // Only a failure is retryable. Re-running a step that succeeded would spend
  // tokens reproducing a document that is already correct, and everything
  // after it is built on the version that exists.
  const failed = step.status === 'FAILED';
  const rerunnable = step.status === 'FAILED' || step.status === 'REJECTED';

  const owedReason = 'This gate was rejected. Supply a replacement document and it re-opens against it';
  const spentReason = `All ${step.revision?.maxRevisions ?? 0} replacement documents have been used; this needs an escalation, not another draft`;

  return {
    approve: {
      enabled: decidable,
      reason: !isGate
        ? 'Only the two human gates take an approval'
        : owed
          ? owedReason
          : spent
            ? spentReason
            : step.status === 'BLOCKED'
              ? 'Clear the blocking findings first'
              : step.status === 'APPROVED'
                ? 'Already approved'
                : 'Waiting for the run to reach this gate',
    },
    reject: {
      enabled: decidable,
      reason: !isGate
        ? 'Only the two human gates take a rejection'
        : owed
          ? owedReason
          : spent
            ? spentReason
            : step.status === 'BLOCKED'
              ? 'Clear the blocking findings first'
              : 'Waiting for the run to reach this gate',
    },
    retry: {
      // A failed step blocks everything behind it, so this is the one control
      // that clears the run: it re-runs strictly that step from the beginning.
      enabled: failed,
      reason:
        step.status === 'RUNNING'
          ? 'This step is already running'
          : step.status === 'PENDING'
            ? 'This step has not run yet'
            : owed
              ? owedReason
              : 'Only a failed step can be retried',
    },
    rerun: {
      // At a rejected gate this is the document upload, not a re-execution.
      enabled: owed ? true : spent ? false : rerunnable && !failed,
      reason: spent
        ? spentReason
        : step.status === 'RUNNING'
          ? 'This step is already running'
          : step.status === 'PENDING'
            ? 'This step has not run yet'
            : 'Cannot restart from here',
    },
  };
}

/** What Rerun means here, for the tooltip and the accessible name. */
export function rerunHint(step: RunStep): string | undefined {
  return awaitingDocument(step)
    ? 'Upload a replacement document — it supersedes the one you rejected and re-opens the gate'
    : undefined;
}

export default function ActionButtons({
  step,
  onAction,
  busy,
  size = 'small',
  showAll,
  compact,
}: Props) {
  const actions = availableActions(step);

  const control = (
    action: StepAction,
    label: string,
    icon: React.ReactNode,
    color: string,
    hint?: string,
  ) => {
    const { enabled, reason } = actions[action];
    if (!enabled && !showAll) return null;

    if (compact) {
      return (
        <Tooltip key={action} title={enabled ? hint ?? label : reason}>
          <span>
            <IconButton
              size="small"
              aria-label={hint ? `${label} — ${hint}` : label}
              disabled={!enabled || busy}
              onClick={() => onAction(action)}
              sx={{
                color,
                border: `1px solid ${alpha(color, 0.45)}`,
                borderRadius: 1,
                bgcolor: alpha(color, 0.1),
                p: 0.5,
                '&:hover': { bgcolor: alpha(color, 0.2), borderColor: color },
                '&.Mui-disabled': { color: tokens.faint, borderColor: tokens.rule },
              }}
            >
              {icon}
            </IconButton>
          </span>
        </Tooltip>
      );
    }

    const button = (
      <span>
        <Button
          size={size}
          variant={action === 'approve' ? 'contained' : 'outlined'}
          startIcon={icon}
          disabled={!enabled || busy}
          onClick={() => onAction(action)}
          sx={{
            ...(action === 'approve'
              ? { bgcolor: color, color: '#1A1400', '&:hover': { bgcolor: color, filter: 'brightness(1.1)' } }
              : { color, borderColor: 'divider', '&:hover': { borderColor: color, bgcolor: 'transparent' } }),
          }}
        >
          {label}
        </Button>
      </span>
    );
    // A tooltip is normally the explanation for a disabled control; an enabled
    // one gets it only where the label alone would understate what it does.
    return enabled && !hint ? (
      <span key={action}>{button}</span>
    ) : (
      <Tooltip key={action} title={enabled ? hint : reason}>
        {button}
      </Tooltip>
    );
  };

  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
      {control('approve', 'Approve', <CheckIcon fontSize="small" />, tokens.signal)}
      {control('reject', 'Reject', <CloseIcon fontSize="small" />, tokens.fail)}
      {control('retry', 'Retry', <RestartIcon fontSize="small" />, tokens.signal,
        'Run this step again from the beginning; the run continues once it clears')}
      {control('rerun', 'Rerun', <ReplayIcon fontSize="small" />, tokens.live, rerunHint(step))}
    </Stack>
  );
}
