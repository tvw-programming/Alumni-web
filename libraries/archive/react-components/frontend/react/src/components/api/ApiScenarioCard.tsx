import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { GenericCard } from '@/components/GenericCard';

import type { ReactNode } from 'react';

export type ApiScenarioStatus = 'idle' | 'pending' | 'success' | 'error';

export interface ApiScenarioCardProps {
  title: string;
  description: string;
  status?: ApiScenarioStatus;
  result?: ReactNode;
  error?: ReactNode;
  actionLabel?: string;
  onRun?: () => void;
  secondaryAction?: ReactNode;
  icon?: ReactNode;
  children?: ReactNode;
}

/** Presentational shell for API demos; request orchestration remains in each parent page. */
export function ApiScenarioCard({
  title,
  description,
  status = 'idle',
  result,
  error,
  actionLabel = 'Run example',
  onRun,
  secondaryAction,
  icon,
  children,
}: ApiScenarioCardProps) {
  return (
    <GenericCard
      header={{ title, subtitle: description, icon }}
      appearance={{ hoverAnimation: false }}
      slots={{
        footer:
          onRun || secondaryAction ? (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {onRun && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={
                    status === 'pending' ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <PlayArrowIcon />
                    )
                  }
                  disabled={status === 'pending'}
                  onClick={onRun}
                >
                  {status === 'pending' ? 'Running…' : actionLabel}
                </Button>
              )}
              {secondaryAction}
            </Stack>
          ) : undefined,
      }}
    >
      <Stack spacing={1.5}>
        {children}
        {status === 'success' && result !== undefined && (
          <Alert severity="success" variant="outlined">
            {result}
          </Alert>
        )}
        {status === 'error' && (
          <Alert severity="error" variant="outlined">
            {error ?? 'The request failed.'}
          </Alert>
        )}
        {status === 'idle' && result === undefined && children === undefined && (
          <Typography variant="body2" color="text.secondary">
            Ready to run.
          </Typography>
        )}
      </Stack>
    </GenericCard>
  );
}
