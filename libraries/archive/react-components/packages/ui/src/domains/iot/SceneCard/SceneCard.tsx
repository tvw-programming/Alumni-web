import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, useAction } from '../../../foundation';

export interface SceneRunResult {
  succeeded: number;
  total: number;
  /** Devices that did not respond, by name. */
  failed: string[];
}

export interface Scene {
  id: string;
  name: string;
  /** Plain-language description of what it does. */
  summary: string;
  deviceCount: number;
  icon?: string;
}

export interface SceneCardProps {
  scene: Scene;
  onRun: () => Promise<SceneRunResult>;
}

/**
 * A scene, and the button that runs it.
 *
 * Scenes touch several devices, and **partial failure is the normal case** —
 * one bulb is unplugged, one switch is out of range. "3 of 4 devices updated,
 * hallway light did not respond" is the honest result, and it is what lets
 * someone go and fix the one that failed. A green tick over a partial run
 * teaches users not to trust the app.
 */
export function SceneCard({ scene, onRun }: SceneCardProps) {
  const [result, run, pending] = useAction<void, SceneRunResult>(async () => onRun());

  const outcome = result.status === 'success' ? result.data : undefined;
  const partial = outcome !== undefined && outcome.failed.length > 0;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {scene.name}
            </Typography>
            {/* Plain language, not a device list: "Dim the lights, close the
                blinds and set the thermostat to 21°". */}
            <Typography variant="caption" color="text.secondary">
              {scene.summary}
            </Typography>
          </Stack>
          <Chip size="small" variant="outlined" label={`${String(scene.deviceCount)} devices`} />
        </Stack>

        {pending ? (
          <Typography
            variant="caption"
            color="text.secondary"
            role="status"
            sx={{ mt: 1, display: 'block' }}
          >
            Scene running…
          </Typography>
        ) : null}

        {outcome ? (
          <Alert severity={partial ? 'warning' : 'success'} sx={{ mt: 1.5, py: 0 }} role="status">
            {partial
              ? `${String(outcome.succeeded)} of ${String(outcome.total)} devices updated. ${outcome.failed.join(', ')} did not respond.`
              : `All ${String(outcome.total)} devices updated.`}
          </Alert>
        ) : null}

        {result.status === 'error' ? (
          <Alert severity="error" sx={{ mt: 1.5, py: 0 }} role="alert">
            {result.message}
          </Alert>
        ) : null}

        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
          <Button
            size="small"
            variant="contained"
            disabled={pending}
            startIcon={pending ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />}
            onClick={() => {
              run();
            }}
            aria-label={describe(`Run scene ${scene.name}`, scene.summary)}
          >
            {pending ? 'Running' : 'Run'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
