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
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { fieldErrorText } from '@/components/forms/formHelpers';
import { snackbar } from '@/components/snackbar/snackbarBus';
import { resetPassword } from '@/services/authService';
import { getUserMessage, normalizeError } from '@/utils/errors';

/**
 * A length floor and nothing else, matching the API.
 *
 * Composition rules ("one uppercase, one symbol") mostly produce `Password1!`
 * and measurably weaken real-world choices. NIST SP 800-63B recommends exactly
 * this: require length, drop the character classes.
 */
const MIN_LENGTH = 12;
const passwordSchema = z.string().min(MIN_LENGTH, `At least ${String(MIN_LENGTH)} characters`);

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { password: '', confirm: '' },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      if (value.password !== value.confirm) {
        setSubmitError('The two passwords do not match.');
        return;
      }
      try {
        const message = await resetPassword(token, value.password);
        snackbar.success(message);
        void navigate('/login', { replace: true });
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

  // A missing token means the link was mistyped or truncated. Say so here
  // rather than letting the user type a password that cannot be submitted.
  if (!token) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <Paper sx={{ p: 4, width: 400 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            This reset link is missing its token. Request a new one.
          </Alert>
          <Link component={RouterLink} to="/forgot-password" variant="body2">
            Request a new link
          </Link>
        </Paper>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" mt={6}>
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h5" gutterBottom>
          Choose a new password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          At least {MIN_LENGTH} characters. A memorable phrase beats a short, complicated one.
        </Typography>

        <form onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            <form.Field name="password" validators={{ onBlur: passwordSchema }}>
              {(field) => (
                <TextField
                  label="New password"
                  type="password"
                  autoComplete="new-password"
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

            <form.Field name="confirm">
              {(field) => (
                <TextField
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  fullWidth
                  value={field.state.value}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    field.handleChange(event.target.value)
                  }
                  onBlur={field.handleBlur}
                  helperText=" "
                />
              )}
            </form.Field>

            {submitError !== null && <Alert severity="error">{submitError}</Alert>}

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
                  {isSubmitting ? 'Updating…' : 'Set new password'}
                </Button>
              )}
            </form.Subscribe>

            <Typography variant="caption" color="text.secondary">
              Setting a new password signs you out everywhere else.
            </Typography>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
