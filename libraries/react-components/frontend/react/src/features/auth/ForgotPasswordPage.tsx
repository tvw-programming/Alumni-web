import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from '@tanstack/react-form';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { z } from 'zod';

import { fieldErrorText } from '@/components/forms/formHelpers';
import { requestPasswordReset, type ForgotPasswordResult } from '@/services/authService';
import { getUserMessage, normalizeError } from '@/utils/errors';

const emailSchema = z.string().email('Enter a valid email address');

/**
 * Requests a password reset link.
 *
 * The confirmation is deliberately vague — "if that email is registered" — and
 * is shown for *every* submission. Saying "no account with that email" would
 * turn this form into a way to test which addresses are registered, which is
 * exactly what the API's identical responses are designed to prevent. Undoing
 * that in the UI would give the whole thing away.
 */
export function ForgotPasswordPage() {
  const [result, setResult] = useState<ForgotPasswordResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        setResult(await requestPasswordReset(value.email));
      } catch (error) {
        setSubmitError(getUserMessage(normalizeError(error)));
      }
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return (
    <Box display="flex" justifyContent="center" mt={6}>
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h5" gutterBottom>
          Reset your password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter your email and we’ll send a link to set a new password.
        </Typography>

        {result ? (
          <Stack spacing={2}>
            <Alert severity="success">{result.message}</Alert>
            {/* Development only: the API returns the link when no mail server
                is configured, so the flow is testable end to end. */}
            {result.devResetUrl && (
              <Alert severity="info">
                <Typography variant="body2" gutterBottom>
                  Development mode — no email was sent. Use this link:
                </Typography>
                <Link href={result.devResetUrl} sx={{ wordBreak: 'break-all' }}>
                  {result.devResetUrl}
                </Link>
              </Alert>
            )}
            <Link component={RouterLink} to="/login" variant="body2">
              Back to sign in
            </Link>
          </Stack>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <Stack spacing={2}>
              <form.Field name="email" validators={{ onBlur: emailSchema }}>
                {(field) => (
                  <TextField
                    label="Email"
                    type="email"
                    autoComplete="username"
                    // A sign-in page exists to be typed into, so focusing its
                    // first field is the documented exception to this rule rather
                    // than a violation of it.
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    fullWidth
                    value={field.state.value}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      field.handleChange(event.target.value)
                    }
                    onBlur={field.handleBlur}
                    error={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                    helperText={
                      field.state.meta.isTouched ? fieldErrorText(field.state.meta.errors) : ' '
                    }
                  />
                )}
              </form.Field>

              {submitError !== null && <Alert severity="error">{submitError}</Alert>}

              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
                    {isSubmitting ? 'Sending…' : 'Send reset link'}
                  </Button>
                )}
              </form.Subscribe>

              <Link component={RouterLink} to="/login" variant="body2">
                Back to sign in
              </Link>
            </Stack>
          </form>
        )}
      </Paper>
    </Box>
  );
}
