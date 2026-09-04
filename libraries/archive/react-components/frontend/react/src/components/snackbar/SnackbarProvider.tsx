import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar, { type SnackbarCloseReason } from '@mui/material/Snackbar';
import { useCallback, useEffect, useState, type ReactNode, type SyntheticEvent } from 'react';

import { snackbar, type SnackbarItem } from './snackbarBus';

/**
 * Renders one snackbar at a time from a FIFO queue (MUI's recommended
 * pattern), fed by the module-level snackbar bus.
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<SnackbarItem[]>([]);
  const [dismissedId, setDismissedId] = useState<number | null>(null);

  useEffect(() => snackbar.subscribe((item) => setQueue((q) => [...q, item])), []);

  // The head of the queue *is* the visible snackbar — no separate `current`
  // state, and so no effect that promotes one into the other. That effect used
  // to call setState synchronously in its body, which costs an extra render
  // pass on every snackbar and is the pattern react-hooks/set-state-in-effect
  // exists to catch.
  //
  // The head stays mounted through its exit transition; `onExited` is what
  // shifts the queue, so the animation is never cut short.
  const current = queue[0] ?? null;
  const open = current !== null && current.id !== dismissedId;

  const handleClose = useCallback(
    (_event: SyntheticEvent | Event | null, reason?: SnackbarCloseReason) => {
      if (reason === 'clickaway') return;
      setDismissedId(current?.id ?? null);
    },
    [current],
  );

  const handleAlertClose = useCallback(() => handleClose(null), [handleClose]);

  const handleExited = useCallback(() => {
    setQueue((q) => q.slice(1));
    setDismissedId(null);
  }, []);

  const handleAction = useCallback(() => {
    current?.action?.onClick();
    handleClose(null);
  }, [current, handleClose]);

  return (
    <>
      {children}
      {current !== null && (
        <Snackbar
          key={current.id}
          open={open}
          autoHideDuration={current.autoHideDuration}
          anchorOrigin={current.anchorOrigin}
          onClose={handleClose}
          slotProps={{ transition: { onExited: handleExited } }}
        >
          <Alert
            severity={current.severity}
            variant="filled"
            onClose={current.dismissible ? handleAlertClose : undefined}
            action={
              current.action ? (
                <Button color="inherit" size="small" onClick={handleAction}>
                  {current.action.label}
                </Button>
              ) : undefined
            }
            sx={{ width: '100%' }}
          >
            {current.message}
          </Alert>
        </Snackbar>
      )}
    </>
  );
}

/** Hook facade over the bus for component usage. */
// eslint-disable-next-line react-refresh/only-export-components -- Keep the existing provider/hook facade together by design.
export function useSnackbar() {
  return snackbar;
}
