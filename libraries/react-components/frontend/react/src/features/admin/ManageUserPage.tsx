import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from '@tanstack/react-form';
import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

import { fieldErrorText } from '@/components/forms/formHelpers';
import { FormGridSplit } from '@/components/layout/FormGridSplit';
import { snackbar } from '@/components/snackbar/snackbarBus';
import { useCreateUser } from '@/hooks/useUsers';
import { getUserMessage, normalizeError } from '@/utils/errors';

import { UsersManagedGrid } from './grids/UsersManagedGrid';

import type { NewUser, User } from '@/types/user';
import type { GridApi } from 'ag-grid-community';

const nameSchema = z.string().min(2, 'Must be 2–40 characters').max(40, 'Must be 2–40 characters');
const emailSchema = z.string().email('Enter a valid email address');
const ageSchema = z
  .number({ invalid_type_error: 'Age must be a number' })
  .int('Age must be a whole number')
  .min(18, 'Age must be 18–100')
  .max(100, 'Age must be 18–100');

const defaultValues: NewUser = { firstName: '', lastName: '', email: '', age: 18 };

function UserQuickAddForm({ onCreated }: { onCreated: (user: User) => void }) {
  const createUser = useCreateUser();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        const created = await createUser.mutateAsync(value);
        onCreated(created);
        snackbar.success(`Created ${created.firstName} ${created.lastName} (id ${created.id})`);
        form.reset();
      } catch (error) {
        const message = getUserMessage(normalizeError(error));
        setSubmitError(message);
        snackbar.error(message);
      }
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" fontWeight={600}>
        Add user
      </Typography>
      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={1.5} alignItems="stretch">
          <form.Field name="firstName" validators={{ onChange: nameSchema }}>
            {(field) => (
              <TextField
                label="First name"
                size="small"
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
          <form.Field name="lastName" validators={{ onChange: nameSchema }}>
            {(field) => (
              <TextField
                label="Last name"
                size="small"
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
          <form.Field name="email" validators={{ onChange: emailSchema }}>
            {(field) => (
              <TextField
                label="Email"
                size="small"
                fullWidth
                type="email"
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
          <form.Field name="age" validators={{ onChange: ageSchema }}>
            {(field) => (
              <TextField
                label="Age"
                size="small"
                fullWidth
                type="number"
                value={Number.isNaN(field.state.value) ? '' : field.state.value}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  field.handleChange(event.target.valueAsNumber)
                }
                onBlur={field.handleBlur}
                error={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                helperText={
                  field.state.meta.isTouched ? fieldErrorText(field.state.meta.errors) : ' '
                }
              />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={!canSubmit || isSubmitting}
                sx={{ mt: 0.5 }}
              >
                {isSubmitting ? 'Adding…' : 'Add'}
              </Button>
            )}
          </form.Subscribe>
        </Stack>
        {submitError !== null && (
          <Typography variant="caption" color="error">
            {submitError}
          </Typography>
        )}
      </form>
    </Stack>
  );
}

/** Manage User: 20% quick-add form + 80% managed users grid. */
export function ManageUserPage() {
  const apiRef = useRef<GridApi<User> | null>(null);

  const handleCreated = useCallback((user: User) => {
    apiRef.current?.applyTransaction({ add: [user], addIndex: 0 });
  }, []);

  return (
    <FormGridSplit
      form={<UserQuickAddForm onCreated={handleCreated} />}
      grid={
        <UsersManagedGrid
          onGridReady={(api) => {
            apiRef.current = api;
          }}
        />
      }
    />
  );
}
