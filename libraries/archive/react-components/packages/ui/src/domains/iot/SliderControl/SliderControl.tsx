import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

export interface SliderControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  disabledReason?: string;
  /** Called on release, and from the +/- buttons. Not on every drag frame. */
  onCommit: (value: number) => Promise<void>;
}

/**
 * A committed slider: brightness, volume, fan speed.
 *
 * Dragging updates **local** state so the handle tracks the finger, and the
 * command is sent **on release**. Sending on every frame floods a Zigbee or
 * Bluetooth device with sixty commands a second, and the queue behind it is why
 * a light appears to lag ten seconds behind the slider.
 *
 * Plus and minus buttons exist because a slider is unusable for anyone who
 * cannot drag precisely — a tremor, a trackpad, a keyboard, a moving train.
 */
export function SliderControl({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  disabled = false,
  disabledReason,
  onCommit,
}: SliderControlProps) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);

  /**
   * The authoritative value wins whenever it changes underneath us — another
   * phone, a wall switch, a schedule.
   *
   * Adjusted during render rather than in an effect. React supports exactly
   * this for "state derived from a prop", and it avoids the extra render an
   * effect costs — which on a slider is a visible flick back to the old value.
   */
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  const commit = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next));
    setDraft(clamped);
    void onCommit(clamped);
  };

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" aria-hidden>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={700} aria-hidden>
          {`${String(draft)}${unit}`}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        {/* The non-gesture fallback. A slider alone excludes anyone who cannot
            drag precisely. */}
        <IconButton
          size="small"
          aria-label={`Decrease ${label}`}
          disabled={disabled || draft <= min}
          onClick={() => {
            commit(draft - step);
          }}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>

        <Slider
          value={draft}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          // Local while dragging…
          onChange={(_event, next) => {
            setDraft(next);
          }}
          // …committed on release.
          onChangeCommitted={(_event, next) => {
            commit(next);
          }}
          aria-label={label}
          getAriaValueText={(current) => `${String(current)}${unit}`}
          valueLabelDisplay="auto"
          sx={{ flexGrow: 1 }}
        />

        <IconButton
          size="small"
          aria-label={`Increase ${label}`}
          disabled={disabled || draft >= max}
          onClick={() => {
            commit(draft + step);
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>

      {disabled && disabledReason ? (
        <Typography variant="caption" color="text.secondary">
          {disabledReason}
        </Typography>
      ) : null}
    </Stack>
  );
}
