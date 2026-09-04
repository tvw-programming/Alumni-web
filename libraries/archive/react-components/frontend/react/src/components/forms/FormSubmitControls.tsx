// components/forms/FormSubmitControls.tsx
import { Backdrop, Box, Button, CircularProgress, Typography } from '@mui/material';
import { useStore, type AnyFormApi } from '@tanstack/react-form';

import type { ReactNode } from 'react';

/**
 * Both components below call `useStore(form.store, selector)` themselves
 * rather than receiving `isSubmitting` as a prop from the wrapper.
 *
 * That is the whole point: the submit/validating flags now re-render only
 * these small leaves. If the wrapper instead read `form.state.isSubmitting`
 * directly, every field in the form would re-render on each submit-state
 * transition — the same pitfall the original react-hook-form version avoided
 * with `useFormState({ control })`.
 */

interface FormSubmitButtonProps {
  /**
   * `AnyFormApi` rather than `any`: these controls read only `isSubmitting`
   * and `canSubmit`, which every form shape has, so the field-level generics
   * that make `FormApi` impractical to thread through leaves are not needed
   * here. It keeps `form.store` typed, so the selectors below are checked.
   */
  form: AnyFormApi;
  label: string;
  /** When true the spinner lives in the page overlay, not the button. */
  blocking: boolean;
}

export function FormSubmitButton({ form, label, blocking }: FormSubmitButtonProps) {
  const [isSubmitting, canSubmit] = useStore(
    form.store,
    (state) => [state.isSubmitting, state.canSubmit] as const,
  );

  return (
    <Button
      type="submit"
      variant="contained"
      color="primary"
      fullWidth
      disabled={isSubmitting || !canSubmit}
    >
      {isSubmitting && !blocking ? <CircularProgress size={24} color="inherit" /> : label}
    </Button>
  );
}

interface BlockingSubmitOverlayProps {
  form: AnyFormApi;
  message?: string;
}

/**
 * Full-page spinner shown while submitting, enabled via the wrapper's
 * `blocking` prop. Blocks interaction with the whole page; when `blocking` is
 * not set the wrapper renders nothing here and the button spinner is used.
 */
export function BlockingSubmitOverlay({
  form,
  message = 'Submitting…',
}: BlockingSubmitOverlayProps) {
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

  return (
    <Backdrop
      open={isSubmitting}
      sx={{
        zIndex: (theme) => theme.zIndex.modal + 1,
        color: '#fff',
        flexDirection: 'column',
        gap: 2,
      }}
      aria-live="polite"
    >
      <CircularProgress color="inherit" />
      <Typography variant="body1">{message}</Typography>
    </Backdrop>
  );
}

/** Shared spacing container for the submit row. */
export function SubmitRow({ children }: { children: ReactNode }) {
  return <Box sx={{ marginTop: 3, display: 'flex', gap: 2 }}>{children}</Box>;
}
