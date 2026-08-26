import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, timeLabel } from '../../../foundation';

export type OrderStepState = 'complete' | 'current' | 'upcoming' | 'failed' | 'skipped';

export interface OrderStep {
  id: string;
  label: string;
  state: OrderStepState;
  at?: string;
  detail?: string;
}

export interface OrderStatusTimelineProps {
  steps: OrderStep[];
  orientation?: 'vertical' | 'horizontal';
}

/**
 * Order progress as an ordered list.
 *
 * A real `<ol>` rather than a row of styled divs: the sequence *is* the
 * meaning, and a screen reader announcing "list, 5 items, item 3 of 5" conveys
 * progress that a visual connector line does not.
 *
 * Each step states its own condition in words. A green tick and a grey circle
 * are the same circle to a screen reader, so the state is in the label too.
 */
export function OrderStatusTimeline({ steps, orientation = 'vertical' }: OrderStatusTimelineProps) {
  const horizontal = orientation === 'horizontal';

  return (
    <Stack
      component="ol"
      direction={horizontal ? 'row' : 'column'}
      spacing={horizontal ? 0 : 0}
      sx={{ listStyle: 'none', m: 0, p: 0 }}
    >
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const icon =
          step.state === 'failed' ? (
            <CancelIcon color="error" fontSize="small" />
          ) : step.state === 'complete' ? (
            <CheckCircleIcon color="success" fontSize="small" />
          ) : step.state === 'current' ? (
            <RadioButtonUncheckedIcon color="primary" fontSize="small" />
          ) : (
            <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
          );

        const stateWord =
          step.state === 'complete'
            ? 'completed'
            : step.state === 'current'
              ? 'in progress'
              : step.state === 'failed'
                ? 'failed'
                : step.state === 'skipped'
                  ? 'skipped'
                  : 'not started';

        return (
          <Box
            key={step.id}
            component="li"
            aria-current={step.state === 'current' ? 'step' : undefined}
            aria-label={describe(
              `Step ${String(index + 1)} of ${String(steps.length)}`,
              step.label,
              stateWord,
              step.at ? timeLabel(step.at) : undefined,
              step.detail,
            )}
            sx={{
              display: 'flex',
              flexDirection: horizontal ? 'column' : 'row',
              alignItems: horizontal ? 'center' : 'flex-start',
              flex: horizontal ? 1 : 'none',
              gap: 1,
            }}
          >
            <Stack
              direction={horizontal ? 'row' : 'column'}
              alignItems="center"
              sx={{ minWidth: 24 }}
            >
              {icon}
              {!last ? (
                <Box
                  aria-hidden
                  sx={{
                    bgcolor: step.state === 'complete' ? 'success.main' : 'divider',
                    ...(horizontal
                      ? { height: 2, flexGrow: 1, minWidth: 24 }
                      : { width: 2, minHeight: 28, my: 0.5 }),
                  }}
                />
              ) : null}
            </Stack>

            <Box sx={{ pb: horizontal ? 0 : 2, textAlign: horizontal ? 'center' : 'left' }}>
              <Typography
                variant="body2"
                fontWeight={step.state === 'current' ? 700 : 500}
                color={step.state === 'upcoming' ? 'text.secondary' : 'text.primary'}
                aria-hidden
              >
                {step.label}
              </Typography>
              {step.at ? (
                <Typography variant="caption" color="text.secondary" display="block" aria-hidden>
                  {timeLabel(step.at)}
                </Typography>
              ) : null}
              {step.detail ? (
                <Typography variant="caption" color="text.secondary" display="block" aria-hidden>
                  {step.detail}
                </Typography>
              ) : null}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
