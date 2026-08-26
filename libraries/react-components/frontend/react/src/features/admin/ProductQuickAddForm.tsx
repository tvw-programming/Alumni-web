import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useForm } from '@tanstack/react-form';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { z } from 'zod';

import { fieldErrorText } from '@/components/forms/formHelpers';
import { snackbar } from '@/components/snackbar/snackbarBus';
import { useCreateProduct } from '@/hooks/useProducts';
import { PRODUCT_CATEGORIES, type NewProduct, type Product } from '@/types/product';
import { getUserMessage, normalizeError } from '@/utils/errors';
import { capitalize } from '@/utils/format';

const titleSchema = z
  .string()
  .min(3, 'Title must be 3–80 characters')
  .max(80, 'Title must be 3–80 characters');
const categorySchema = z.string().min(1, 'Pick a category');
const priceSchema = z
  .number({ invalid_type_error: 'Price must be a number' })
  .positive('Price must be greater than 0');
const stockSchema = z
  .number({ invalid_type_error: 'Stock must be a number' })
  .int('Stock must be a whole number')
  .min(0, 'Stock must be 0–99999')
  .max(99999, 'Stock must be 0–99999');

const defaultValues: NewProduct = {
  title: '',
  category: '',
  price: 0,
  stock: 0,
  description: '',
};

interface ProductQuickAddFormProps {
  /** Called with the created product so the host can prepend it to the grid. */
  onCreated: (product: Product) => void;
}

/** Compact single-row create-product form for the Manage Product pages. */
export function ProductQuickAddForm({ onCreated }: ProductQuickAddFormProps) {
  const createProduct = useCreateProduct();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        const created = await createProduct.mutateAsync(value);
        onCreated(created);
        snackbar.success(`Created “${created.title}” (id ${created.id})`);
        form.reset();
      } catch (error) {
        const message = getUserMessage(normalizeError(error));
        setSubmitError(message);
        snackbar.error(message);
        // Values are intentionally preserved on failure.
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
        Add product
      </Typography>
      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={1.5} alignItems="stretch">
          <form.Field name="title" validators={{ onChange: titleSchema }}>
            {(field) => (
              <TextField
                label="Title"
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
          <form.Field name="category" validators={{ onChange: categorySchema }}>
            {(field) => (
              <TextField
                label="Category"
                size="small"
                fullWidth
                select
                value={field.state.value}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  field.handleChange(event.target.value)
                }
                onBlur={field.handleBlur}
                error={field.state.meta.isTouched && field.state.meta.errors.length > 0}
                helperText={
                  field.state.meta.isTouched ? fieldErrorText(field.state.meta.errors) : ' '
                }
              >
                {PRODUCT_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {capitalize(category)}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </form.Field>
          <form.Field name="price" validators={{ onChange: priceSchema }}>
            {(field) => (
              <TextField
                label="Price (USD)"
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
          <form.Field name="stock" validators={{ onChange: stockSchema }}>
            {(field) => (
              <TextField
                label="Stock"
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
