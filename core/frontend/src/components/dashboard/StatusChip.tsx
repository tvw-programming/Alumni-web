import { Box, Chip, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { StepStatus } from '../../types/workflow';
import { statusMeta, fonts } from '../../theme';

interface Props {
  status: StepStatus;
  size?: 'small' | 'medium';
  /** Adds a slow pulse for running work. */
  animated?: boolean;
}

export default function StatusChip({ status, size = 'small', animated = true }: Props) {
  const meta = statusMeta[status];
  const running = status === 'RUNNING';

  return (
    <Chip
      size={size}
      label={meta.label}
      icon={
        <Box
          component="span"
          aria-hidden
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: meta.color,
            ml: '8px !important',
            mr: '-2px !important',
            ...(running && animated
              ? {
                  animation: 'statusPulse 1.6s ease-in-out infinite',
                  '@keyframes statusPulse': {
                    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                    '50%': { opacity: 0.35, transform: 'scale(0.72)' },
                  },
                }
              : {}),
          }}
        />
      }
      sx={{
        fontFamily: fonts.mono,
        color: meta.color,
        bgcolor: alpha(meta.color, 0.1),
        border: `1px solid ${alpha(meta.color, 0.32)}`,
        '& .MuiChip-label': { pl: 0.75, pr: 1 },
      }}
    />
  );
}

/** Compact square badge used inside dense tables. */
export function StatusDot({ status }: { status: StepStatus }) {
  const meta = statusMeta[status];
  return (
    <Tooltip title={meta.label}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '2px',
          bgcolor: meta.color,
          boxShadow: `0 0 0 3px ${alpha(meta.color, 0.16)}`,
        }}
      />
    </Tooltip>
  );
}
