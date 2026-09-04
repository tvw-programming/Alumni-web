import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface FullscreenRequestOverlayProps {
  open: boolean;
  message?: string;
}

/** Generic blocking feedback only; the parent owns the request and open state. */
export function FullscreenRequestOverlay({
  open,
  message = 'Loading data…',
}: FullscreenRequestOverlayProps) {
  return (
    <Backdrop
      open={open}
      aria-live="polite"
      sx={{ zIndex: (theme) => theme.zIndex.modal + 1, color: '#fff' }}
    >
      <Stack alignItems="center" spacing={2}>
        <CircularProgress color="inherit" />
        <Typography>{message}</Typography>
      </Stack>
    </Backdrop>
  );
}
