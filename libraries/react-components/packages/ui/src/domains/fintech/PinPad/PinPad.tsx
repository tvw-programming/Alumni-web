import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMemo } from 'react';

export interface PinPadProps {
  length: number;
  /** Digits entered so far. The parent holds it; this never stores a PIN. */
  value: string;
  prompt?: string;
  errorMessage?: string;
  attemptsRemaining?: number;
  disabled?: boolean;
  /** Shuffles the key layout — defeats shoulder-surfing by position. */
  shuffle?: boolean;
  onChange: (next: string) => void;
  onComplete: (pin: string) => void;
}

function digits(shuffle: boolean): string[] {
  const base = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  if (!shuffle) return base;
  // Fisher–Yates. `Math.random` is fine: this defeats a watching human, not a
  // cryptographic adversary, and the layout is visible on screen anyway.
  const shuffled = [...base];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled;
}

/**
 * PIN entry.
 *
 * Three rules, all of them security rather than style:
 *
 * 1. **The PIN never lives here.** The parent holds it and clears it; a
 *    component that kept it in its own state would keep it after unmount, in a
 *    fiber the profiler can read.
 * 2. **The dots have a label, not a count of bullets.** "4 of 6 digits
 *    entered" tells a screen-reader user where they are without ever
 *    announcing a digit — announcing the digits would read the PIN aloud in a
 *    room.
 * 3. **`shuffle` randomises the layout.** Positional shoulder-surfing is the
 *    realistic attack on a keypad in public.
 */
export function PinPad({
  length,
  value,
  prompt = 'Enter your PIN',
  errorMessage,
  attemptsRemaining,
  disabled = false,
  shuffle = false,
  onChange,
  onComplete,
}: PinPadProps) {
  // Re-shuffled per mount, not per keystroke: moving the keys under a finger
  // mid-entry produces wrong PINs and lockouts.
  const keys = useMemo(() => digits(shuffle), [shuffle]);

  const press = (digit: string) => {
    if (disabled || value.length >= length) return;
    const next = value + digit;
    onChange(next);
    if (next.length === length) onComplete(next);
  };

  return (
    <Stack spacing={2} alignItems="center">
      <Typography variant="body1">{prompt}</Typography>

      <Stack
        direction="row"
        spacing={1.5}
        role="status"
        aria-label={`${String(value.length)} of ${String(length)} digits entered`}
      >
        {Array.from({ length }, (_unused, index) => (
          <Box
            key={index}
            aria-hidden
            sx={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: errorMessage ? 'error.main' : 'text.secondary',
              bgcolor:
                index < value.length
                  ? errorMessage
                    ? 'error.main'
                    : 'text.primary'
                  : 'transparent',
            }}
          />
        ))}
      </Stack>

      <Box sx={{ minHeight: 40, textAlign: 'center' }}>
        {errorMessage ? (
          <Typography variant="body2" color="error.main" role="alert">
            {errorMessage}
          </Typography>
        ) : null}
        {attemptsRemaining !== undefined ? (
          <Typography
            variant="caption"
            color={attemptsRemaining <= 1 ? 'error.main' : 'text.secondary'}
          >
            {`${String(attemptsRemaining)} attempt${attemptsRemaining === 1 ? '' : 's'} remaining`}
          </Typography>
        ) : null}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          maxWidth: 300,
          width: '100%',
        }}
      >
        {keys.slice(0, 9).map((digit) => (
          <Button
            key={digit}
            variant="outlined"
            size="large"
            disabled={disabled}
            aria-label={digit}
            onClick={() => {
              press(digit);
            }}
            sx={{ py: 1.5, fontSize: 20 }}
          >
            {digit}
          </Button>
        ))}
        <Box />
        <Button
          variant="outlined"
          size="large"
          disabled={disabled}
          aria-label={keys[9]}
          onClick={() => {
            press(keys[9]);
          }}
          sx={{ py: 1.5, fontSize: 20 }}
        >
          {keys[9]}
        </Button>
        <Button
          variant="text"
          size="large"
          disabled={disabled || value.length === 0}
          aria-label="Delete last digit"
          onClick={() => {
            onChange(value.slice(0, -1));
          }}
        >
          <BackspaceOutlinedIcon />
        </Button>
      </Box>
    </Stack>
  );
}
