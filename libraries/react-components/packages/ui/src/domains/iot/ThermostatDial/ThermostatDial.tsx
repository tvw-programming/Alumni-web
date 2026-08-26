import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

export type ThermostatMode = 'off' | 'heat' | 'cool' | 'auto';

export interface ThermostatDialProps {
  /** What the room is. Measured, never predicted. */
  ambient: number;
  /** What the user asked for. Adjustable. */
  target: number;
  mode: ThermostatMode;
  unit?: '°C' | '°F';
  min?: number;
  max?: number;
  step?: number;
  /** "Heating to 22°" — what the system is doing right now. */
  activity?: string;
  onCommitTarget: (target: number) => Promise<void>;
  onModeChange: (mode: ThermostatMode) => Promise<void>;
}

/**
 * A thermostat.
 *
 * The distinction the whole component is built around: **ambient is measured,
 * target is requested.** Showing one number for both is the classic thermostat
 * UI bug — the user nudges "21" and cannot tell whether the room is 21 or the
 * setpoint is.
 *
 * The dial is an SVG with `role="slider"` semantics on a real focusable
 * element, plus +/- buttons, because a circular drag target is unusable by
 * keyboard and hard on a touchscreen in the dark.
 */
export function ThermostatDial({
  ambient,
  target,
  mode,
  unit = '°C',
  min = 5,
  max = 30,
  step = 0.5,
  activity,
  onCommitTarget,
  onModeChange,
}: ThermostatDialProps) {
  const [draft, setDraft] = useState(target);
  const [lastTarget, setLastTarget] = useState(target);

  // Adjusted during render, not in an effect: the setpoint can change from
  // another phone or a schedule, and an effect would cost an extra render that
  // shows the stale number first.
  if (target !== lastTarget) {
    setLastTarget(target);
    setDraft(target);
  }

  const commit = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next));
    setDraft(clamped);
    void onCommitTarget(clamped);
  };

  const fraction = (draft - min) / (max - min);
  const angle = 135 + fraction * 270;
  const radians = (angle * Math.PI) / 180;
  const knobX = 50 + 38 * Math.cos(radians);
  const knobY = 50 + 38 * Math.sin(radians);

  return (
    <Stack spacing={2} alignItems="center">
      <Box sx={{ position: 'relative', width: 220, height: 220 }}>
        <Box
          component="svg"
          viewBox="0 0 100 100"
          aria-hidden
          sx={{ width: '100%', height: '100%' }}
        >
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            opacity={0.15}
          />
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${String(fraction * 179)} 400`}
            transform="rotate(135 50 50)"
            style={{
              color: mode === 'cool' ? '#0284c7' : mode === 'heat' ? '#ea580c' : 'currentColor',
            }}
          />
          <circle cx={knobX} cy={knobY} r="4" fill="currentColor" />
        </Box>

        <Stack
          sx={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
          spacing={0}
        >
          {/* The number the user is setting… */}
          <Typography variant="h3" fontWeight={700} aria-hidden>
            {`${draft.toFixed(1)}${unit}`}
          </Typography>
          {/* …and, distinctly, what the room actually is. */}
          <Typography variant="caption" color="text.secondary" aria-hidden>
            {`Room ${ambient.toFixed(1)}${unit}`}
          </Typography>
          {activity ? (
            <Typography variant="caption" color="primary.main" aria-hidden>
              {activity}
            </Typography>
          ) : null}
        </Stack>
      </Box>

      <Stack direction="row" spacing={2} alignItems="center">
        <IconButton
          aria-label={`Decrease target temperature`}
          disabled={draft <= min}
          onClick={() => {
            commit(draft - step);
          }}
        >
          <RemoveIcon />
        </IconButton>

        {/* The real control for keyboard and screen reader. The dial above is
            decoration; this is what is focusable and adjustable. */}
        <Box
          role="slider"
          tabIndex={0}
          aria-label="Target temperature"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={draft}
          aria-valuetext={`${draft.toFixed(1)} ${unit === '°C' ? 'degrees Celsius' : 'degrees Fahrenheit'}, room is ${ambient.toFixed(1)}`}
          onKeyDown={(event) => {
            if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
              event.preventDefault();
              commit(draft + step);
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
              event.preventDefault();
              commit(draft - step);
            }
          }}
          sx={{
            px: 2,
            py: 0.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            minWidth: 96,
            textAlign: 'center',
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
          }}
        >
          <Typography variant="body2" fontWeight={700}>
            {`${draft.toFixed(1)}${unit}`}
          </Typography>
        </Box>

        <IconButton
          aria-label="Increase target temperature"
          disabled={draft >= max}
          onClick={() => {
            commit(draft + step);
          }}
        >
          <AddIcon />
        </IconButton>
      </Stack>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={mode}
        aria-label="Mode"
        onChange={(_event, next: ThermostatMode | null) => {
          if (next) void onModeChange(next);
        }}
      >
        <ToggleButton value="off">Off</ToggleButton>
        <ToggleButton value="heat">Heat</ToggleButton>
        <ToggleButton value="cool">Cool</ToggleButton>
        <ToggleButton value="auto">Auto</ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
