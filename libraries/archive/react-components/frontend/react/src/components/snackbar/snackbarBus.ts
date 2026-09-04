import type { AlertColor, SnackbarOrigin } from '@mui/material';

export interface SnackbarAction {
  label: string;
  onClick: () => void;
}

export interface SnackbarOptions {
  message: string;
  severity?: AlertColor;
  /** Optional action button rendered inside the alert. */
  action?: SnackbarAction;
  /** Show an X dismiss button. Default true. */
  dismissible?: boolean;
  /** ms until auto-hide; null keeps the snackbar open until dismissed. Default 5000. */
  autoHideDuration?: number | null;
  anchorOrigin?: SnackbarOrigin;
}

export interface SnackbarItem extends Required<Omit<SnackbarOptions, 'action'>> {
  id: number;
  action?: SnackbarAction;
}

type Listener = (item: SnackbarItem) => void;

const listeners = new Set<Listener>();
let nextId = 1;

function emit(options: SnackbarOptions): number {
  const item: SnackbarItem = {
    severity: 'info',
    dismissible: true,
    autoHideDuration: 5000,
    anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
    ...options,
    id: nextId++,
  };
  listeners.forEach((listener) => listener(item));
  return item.id;
}

type ShortcutOptions = Omit<SnackbarOptions, 'message' | 'severity'>;

/**
 * Module-level bus so snackbars can be triggered programmatically from
 * anywhere (services, query cache callbacks) — not just inside components.
 * SnackbarProvider subscribes and renders.
 */
export const snackbar = {
  show: emit,
  success: (message: string, options?: ShortcutOptions) =>
    emit({ ...options, message, severity: 'success' }),
  info: (message: string, options?: ShortcutOptions) =>
    emit({ ...options, message, severity: 'info' }),
  warning: (message: string, options?: ShortcutOptions) =>
    emit({ ...options, message, severity: 'warning' }),
  error: (message: string, options?: ShortcutOptions) =>
    emit({ ...options, message, severity: 'error' }),
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
