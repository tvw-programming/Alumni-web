import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from '@tanstack/react-form';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { fieldErrorText } from '@/components/forms/formHelpers';
import { snackbar } from '@/components/snackbar/snackbarBus';
import { useAuth } from '@/store/authContext';
import { normalizeError, getUserMessage } from '@/utils/errors';

const emailSchema = z.string().email('Enter a valid email address');
const passwordSchema = z.string().min(1, 'Password is required');

const DEFAULT_DESTINATION = '/admin/dashboard';

interface LocationState {
  returnTo?: string;
}

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const returnTo = (location.state as LocationState | null)?.returnTo ?? DEFAULT_DESTINATION;

  const form = useForm({
    defaultValues: { email: '', password: '', rememberMe: false },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await login(value);
        snackbar.success('Welcome back!');
        void navigate(returnTo, { replace: true });
      } catch (error) {
        // The API's own message is the useful one here ("Email or password is
        // incorrect", "Too many failed attempts"). `getUserMessage` maps every
        // 401 to "Please sign in to continue.", which is right for an expired
        // session and useless on the form you are already signing in with.
        const normalized = normalizeError(error);
        setSubmitError(normalized.message || getUserMessage(normalized));
      }
    },
  });

  // Already signed in → skip the form and go straight to the admin area.
  if (isAuthenticated) {
    return <Navigate to={DEFAULT_DESTINATION} replace />;
  }

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return (
    <Box display="flex" justifyContent="center" mt={6}>
      <Paper sx={{ p: 4, width: 400 }}>
        <Typography variant="h5" gutterBottom>
          Sign in
        </Typography>

        {import.meta.env.DEV && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Seeded accounts: <strong>admin@gmail.com</strong> and <strong>user@gmail.com</strong>,
            password <strong>Password123!</strong>
          </Alert>
        )}

        {/*
          `noValidate` hands validation to the schema, so the messages match the
          rest of the app instead of being the browser's own.
        */}
        <form onSubmit={handleFormSubmit} noValidate>
          <Stack spacing={2}>
            <form.Field name="email" validators={{ onBlur: emailSchema }}>
              {(field) => (
                <TextField
                  label="Email"
                  type="email"
                  // `username` is the correct autocomplete token for the
                  // identifier field even when it holds an email — password
                  // managers key off it together with current-password below.
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

            <form.Field name="password" validators={{ onBlur: passwordSchema }}>
              {(field) => (
                <TextField
                  label="Password"
                  type="password"
                  autoComplete="current-password"
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

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <form.Field name="rememberMe">
                {(field) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={field.state.value}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          field.handleChange(event.target.checked)
                        }
                      />
                    }
                    label="Remember me"
                  />
                )}
              </form.Field>

              <Link component={RouterLink} to="/forgot-password" variant="body2">
                Forgot password?
              </Link>
            </Stack>

            {submitError !== null && <Alert severity="error">{submitError}</Alert>}

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" variant="contained" disabled={isSubmitting} fullWidth>
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              )}
            </form.Subscribe>

            <Typography variant="caption" color="text.secondary">
              “Remember me” keeps you signed in for 30 days. Leave it off and the session ends when
              the browser closes.
            </Typography>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
