import { Box, Step, StepLabel, Stepper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { RunStep } from '../../types/workflow';
import { fonts, phases, tokens } from '../../theme';

interface Props {
  steps: RunStep[];
}

type PhaseState = 'done' | 'active' | 'failed' | 'pending';

function phaseState(members: RunStep[]): PhaseState {
  if (members.some((s) => s.status === 'FAILED' || s.status === 'REJECTED')) return 'failed';
  if (members.some((s) => s.status === 'RUNNING' || s.status === 'AWAITING_APPROVAL' || s.status === 'BLOCKED'))
    return 'active';
  if (members.every((s) => s.status === 'SUCCESS' || s.status === 'APPROVED')) return 'done';
  return 'pending';
}

const stateColor: Record<PhaseState, string> = {
  done: tokens.pass,
  active: tokens.live,
  failed: tokens.fail,
  pending: tokens.idle,
};

/** Seven phases across the top — the coarse read before the step-level detail. */
export default function PhaseStepper({ steps }: Props) {
  const byNumber = new Map(steps.map((s) => [s.step, s]));

  return (
    <Stepper
      alternativeLabel
      activeStep={-1}
      connector={null}
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)', lg: 'repeat(7, 1fr)' },
        gap: 1,
        p: 0,
      }}
    >
      {phases.map((phase) => {
        const members = phase.steps.map((n) => byNumber.get(n)).filter(Boolean) as RunStep[];
        const state = phaseState(members);
        const color = stateColor[state];
        const isGate = phase.id.startsWith('gate');
        const complete = members.filter((s) => s.status === 'SUCCESS' || s.status === 'APPROVED').length;

        return (
          <Step key={phase.id} completed={state === 'done'} sx={{ p: 0 }}>
            <StepLabel
              slots={{ stepIcon: () => null }}
              sx={{
                '& .MuiStepLabel-labelContainer': { width: '100%' },
                '& .MuiStepLabel-label': { mt: '0 !important' },
              }}
            >
              <Box
                sx={{
                  textAlign: 'left',
                  // A thin outline on every side, the way the metric tiles above
                  // are outlined: with only a top rule, a phase nobody has
                  // reached yet reads as loose text rather than as a card in a
                  // row of cards. The colour still carries the state — neutral
                  // while pending, the phase's own colour once it means
                  // something — so the row stays scannable at a glance.
                  border: `1px solid ${state === 'pending' ? tokens.rule : alpha(color, 0.35)}`,
                  borderTop: `2px solid ${color}`,
                  bgcolor: state === 'pending' ? tokens.panel : alpha(color, 0.06),
                  px: 1.25,
                  py: 1,
                  borderRadius: 1,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: fonts.mono,
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    color,
                    textTransform: 'uppercase',
                  }}
                >
                  {isGate ? 'gate' : `${phase.steps[0]}–${phase.steps[phase.steps.length - 1]}`}
                </Typography>
                <Typography
                  sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary', lineHeight: 1.35, mt: 0.25 }}
                >
                  {phase.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {complete}/{members.length}
                </Typography>
              </Box>
            </StepLabel>
          </Step>
        );
      })}
    </Stepper>
  );
}
