// components/ProductForm.tsx
//
// Showcases the schema-driven field system (`components/forms/*`) wired to
// this app's real data layer: submitting persists through `useCreateProduct`
// (TanStack Query, see `hooks/useProducts.ts`) exactly like `ProductQuickAddForm`
// does, instead of the `console.log`-only stub this was ported from. Field
// rendering, validation and layout come from the JSON schema; server
// persistence, retries and cache invalidation stay with TanStack Query — see
// the migration notes in this repo for why the two are split this way.
import Typography from '@mui/material/Typography';
import { useCallback, useMemo } from 'react';

import { asInputValue, asNumber } from '@/components/forms/fields/valueCoercion';
import {
  extractInvalidFields,
  resolveFields,
  type HandlerRegistry,
} from '@/components/forms/formHelpers';
import { snackbar } from '@/components/snackbar/snackbarBus';
import { useCreateProduct } from '@/hooks/useProducts';
import { isAppError } from '@/types/api';
import { logInfo, logWarning } from '@/utils/errorLogger';
import { getUserMessage } from '@/utils/errors';

import productSchemaJson from '../schemas/productSchema.json';

import { buildDefaultValues } from './forms/fields';
import { SchemaFormWrapper } from './forms/SchemaFormWrapper';

import type { FieldConfigV2, FieldValue, FormSchemaV2, FormValues } from '@/types/formSystem';
import type { NewProduct } from '@/types/product';

const SOURCE_FILE = 'ProductForm.tsx';
const FORM_NAME = 'productForm';
const API_ENDPOINT = '/products/add';
const HTTP_METHOD = 'POST';

const RAW_FIELDS = productSchemaJson.fields as unknown as FieldConfigV2[];

const DEFAULT_VALUES = buildDefaultValues(RAW_FIELDS, {
  themeColor: '#2196f3',
  warrantyMonths: 12,
});

/**
 * Maps the demo schema's rich field set onto the app's real `NewProduct`
 * payload. The schema intentionally collects more than `/products/add`
 * persists (rating, images, tags, shipping regions, warranty, ...) to
 * showcase the field system; only what the API accepts is forwarded.
 * `stock` has no corresponding schema field yet, so it defaults to 0 — add a
 * field to `schemas/productSchema.json` if inventory needs capturing here.
 */
function toNewProduct(data: FormValues): NewProduct {
  return {
    title: asInputValue(data.productName),
    description: asInputValue(data.description),
    price: asNumber(data.price),
    category: asInputValue(data.category),
    stock: 0,
  };
}

export default function ProductForm() {
  const createProduct = useCreateProduct();

  // These receive whatever the field holds, not a guaranteed string — the
  // schema decides which field each is attached to. Narrow, then work.
  // These demonstrate the schema's `onCustomChange` / `onCustomBlur` hooks
  // firing. They go to the app's own log (visible on the admin error-log page)
  // rather than the console, so nothing debug-shaped ships in the bundle.
  const handleDescriptionChange = useCallback((value: FieldValue) => {
    logInfo({
      fileName: SOURCE_FILE,
      lineNumber: null,
      apiEndpoint: null,
      httpMethod: null,
      error: 'FIELD_CHANGED',
      errorDescription: `description changed (${String(asInputValue(value).length)} characters)`,
      context: { formName: FORM_NAME, field: 'description' },
    });
  }, []);

  const handleDescriptionBlur = useCallback((value: FieldValue) => {
    logInfo({
      fileName: SOURCE_FILE,
      lineNumber: null,
      apiEndpoint: null,
      httpMethod: null,
      error: 'FIELD_BLURRED',
      errorDescription: 'description blurred',
      context: { formName: FORM_NAME, field: 'description', value: asInputValue(value) },
    });
  }, []);

  const descriptionValidation = useCallback((value: FieldValue) => {
    const text = asInputValue(value);
    if (!text) return true;
    if (text.length < 10) return 'Description should be at least 10 characters';
    if (text.length > 500) return 'Description cannot exceed 500 characters';
    return true;
  }, []);

  const registry = useMemo<HandlerRegistry>(
    () => ({ descriptionValidation, handleDescriptionChange, handleDescriptionBlur }),
    [descriptionValidation, handleDescriptionChange, handleDescriptionBlur],
  );

  const fields = useMemo(
    () => resolveFields(RAW_FIELDS, registry, { sourceFile: SOURCE_FILE, formName: FORM_NAME }),
    [registry],
  );

  const handleSubmit = useCallback(
    async (data: FormValues) => {
      const created = await createProduct.mutateAsync(toNewProduct(data));
      snackbar.success(`Product "${created.title}" created (id ${created.id})`, {
        action: {
          label: 'VIEW',
          onClick: () => {
            // TODO: navigate to the product once a detail route exists.
            logInfo({
              fileName: SOURCE_FILE,
              lineNumber: null,
              apiEndpoint: null,
              httpMethod: null,
              error: 'VIEW_PRODUCT_REQUESTED',
              errorDescription: `View requested for product ${String(created.id)}`,
              context: { formName: FORM_NAME, productId: created.id },
            });
          },
        },
      });
    },
    [createProduct],
  );

  const handleError = useCallback((errors: unknown) => {
    // A rejected mutation is rethrown by the axios interceptor as a
    // normalized AppError (see utils/errors.ts) — not a native `Error` — so
    // that shape is what distinguishes "the API call failed" from "the form
    // engine blocked submission because a field is invalid" below.
    if (isAppError(errors)) {
      snackbar.error(getUserMessage(errors), {
        action: {
          label: 'RETRY',
          onClick: () => {
            // TODO: re-submit the last payload once the form exposes one.
            logInfo({
              fileName: SOURCE_FILE,
              lineNumber: null,
              apiEndpoint: null,
              httpMethod: null,
              error: 'SUBMIT_RETRY_REQUESTED',
              errorDescription: 'Retry requested after a failed submit',
              context: { formName: FORM_NAME },
            });
          },
        },
      });
      return;
    }

    const invalidFields = extractInvalidFields(errors);
    const count = invalidFields.length;
    snackbar.warning(`Please fix ${count} field${count === 1 ? '' : 's'} before submitting.`, {
      action: {
        label: 'DETAILS',
        onClick: () => {
          // Persisted, so the list survives the snackbar and is readable on
          // the admin error-log page — console.table was lost on reload.
          logWarning({
            fileName: SOURCE_FILE,
            lineNumber: null,
            apiEndpoint: null,
            httpMethod: null,
            error: 'SUBMIT_BLOCKED',
            errorDescription: `Invalid fields: ${invalidFields.join(', ')}`,
            context: { formName: FORM_NAME, invalidFields },
          });
        },
      },
    });
  }, []);

  const formSchema = useMemo<FormSchemaV2>(
    () => ({ fields, onSubmit: handleSubmit, onError: handleError }),
    [fields, handleSubmit, handleError],
  );

  return (
    <div>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Product Form
      </Typography>

      <SchemaFormWrapper
        schema={formSchema}
        submitButtonLabel="Create Product"
        defaultValues={DEFAULT_VALUES}
        defaultDebounceMs={250}
        sourceFile={SOURCE_FILE}
        formName={FORM_NAME}
        apiEndpoint={API_ENDPOINT}
        httpMethod={HTTP_METHOD}
      />
    </div>
  );
}
