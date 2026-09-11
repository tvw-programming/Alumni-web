/**
 * Profile screen — the Education section rendered by the shared schema form.
 *
 * This is the screen that proves the library integration works: SchemaFormWrapper
 * comes from vendor/react-components and resolves its own `@/` imports through
 * the alias in vite.config.ts. If that alias is wrong, this is the page that
 * fails to load.
 */
import { Alert, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

import SchemaFormWrapper from '@ui/components/forms/SchemaFormWrapper';
import type { FormValues } from '@/types/formSystem';

import { buildEducationSchema, validateEducationRow } from '~/features/alumni/educationFormSchema';

export default function ProfilePage() {
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (values: FormValues) => {
    // The one rule the field list cannot express. Postgres checks it too
    // (education_years_ordered) — this copy just makes the error immediate.
    const invalid = validateEducationRow(values);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setSaved(`${String(values.degree)} at ${String(values.institution)}`);
  }, []);

  // Memoised: SchemaFormWrapper takes the schema by reference, and a fresh
  // object each render would remount every field.
  const schema = useMemo(
    () => buildEducationSchema(handleSubmit, (e) => setError(String(e))),
    [handleSubmit],
  );

  return (
    <Stack spacing={3} sx={{ maxWidth: 760 }}>
      <div>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Education</Typography>
        <Typography variant="body2" color="text.secondary">
          Rendered by <code>SchemaFormWrapper</code> from the shared library, driven by the field
          list in <code>educationFormSchema.ts</code>.
        </Typography>
      </div>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Card variant="outlined">
        <CardContent>
          <SchemaFormWrapper
            schema={schema}
            submitButtonLabel="Save education"
            sourceFile="features/alumni/ProfilePage.tsx"
          />
        </CardContent>
      </Card>

      <Snackbar
        open={saved !== null}
        autoHideDuration={4000}
        onClose={() => setSaved(null)}
        message={saved ? `Saved — ${saved}` : ''}
      />
    </Stack>
  );
}
