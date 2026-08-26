import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from '@tanstack/react-form';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

import { fieldErrorText } from '@/components/forms/formHelpers';
import { snackbar } from '@/components/snackbar/snackbarBus';

const nameSchema = z.string().min(2, 'Please enter your name');
const emailSchema = z.string().email('Enter a valid email address');
const messageSchema = z.string().min(10, 'Message must be at least 10 characters');

/** Static contact page with a simple (mock) contact form. */
export function ContactPage() {
  const [pending, setPending] = useState(false);

  const form = useForm({
    defaultValues: { name: '', email: '', message: '' },
    onSubmit: async ({ value: _value }) => {
      setPending(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setPending(false);
      snackbar.success('Thanks! We’ll get back to you shortly.');
      form.reset();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 560 }}>
      <div>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Contact Us
        </Typography>
        <Typography color="text.secondary">
          Questions or feedback? Send us a message and we’ll respond by email.
        </Typography>
      </div>

      <Paper sx={{ p: 4 }}>
        <form onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            <form.Field name="name" validators={{ onChange: nameSchema }}>
              {(field) => (
                <TextField
                  label="Name"
                  value={field.state.value}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    field.handleChange(event.target.value)
                  }
                  onBlur={field.handleBlur}
                  error={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                  helperText={
                    field.state.meta.isTouched ? fieldErrorText(field.state.meta.errors) : undefined
                  }
                  fullWidth
                />
              )}
            </form.Field>
            <form.Field name="email" validators={{ onChange: emailSchema }}>
              {(field) => (
                <TextField
                  label="Email"
                  type="email"
                  value={field.state.value}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    field.handleChange(event.target.value)
                  }
                  onBlur={field.handleBlur}
                  error={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                  helperText={
                    field.state.meta.isTouched ? fieldErrorText(field.state.meta.errors) : undefined
                  }
                  fullWidth
                />
              )}
            </form.Field>
            <form.Field name="message" validators={{ onChange: messageSchema }}>
              {(field) => (
                <TextField
                  label="Message"
                  multiline
                  minRows={4}
                  value={field.state.value}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    field.handleChange(event.target.value)
                  }
                  onBlur={field.handleBlur}
                  error={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                  helperText={
                    field.state.meta.isTouched ? fieldErrorText(field.state.meta.errors) : undefined
                  }
                  fullWidth
                />
              )}
            </form.Field>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
              {([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!canSubmit || isSubmitting || pending}
                >
                  {pending ? 'Sending…' : 'Send message'}
                </Button>
              )}
            </form.Subscribe>
          </Stack>
        </form>
      </Paper>
    </Stack>
  );
}
