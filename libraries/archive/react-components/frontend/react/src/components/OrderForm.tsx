// components/OrderForm.tsx
//
// Sibling to ProductForm.tsx: same schema-driven field system, wired to
// `useCreateOrder` (TanStack Query mutation, see `hooks/useOrders.ts`) instead
// of a `console.log`-only stub. The order schema maps 1:1 onto `NewOrder`, so
// there's no field-subsetting here the way ProductForm needs.
import Typography from '@mui/material/Typography';
import { useCallback, useMemo } from 'react';

import { asInputValue, asNumber } from '@/components/forms/fields/valueCoercion';
import {
  extractInvalidFields,
  resolveFields,
  type HandlerRegistry,
} from '@/components/forms/formHelpers';
import { snackbar } from '@/components/snackbar/snackbarBus';
import { useCreateOrder } from '@/hooks/useOrders';
import { isAppError } from '@/types/api';
import { ORDER_STATUSES, type NewOrder, type OrderStatus } from '@/types/order';
import { logInfo, logWarning } from '@/utils/errorLogger';
import { getUserMessage } from '@/utils/errors';

import orderSchemaJson from '../schemas/orderSchema.json';

import { buildDefaultValues } from './forms/fields';
import { SchemaFormWrapper } from './forms/SchemaFormWrapper';

import type { FieldConfigV2, FieldValue, FormSchemaV2, FormValues } from '@/types/formSystem';

const SOURCE_FILE = 'OrderForm.tsx';
const FORM_NAME = 'orderForm';
const API_ENDPOINT = '/orders/add';
const HTTP_METHOD = 'POST';

const RAW_FIELDS = orderSchemaJson.fields as unknown as FieldConfigV2[];

// Derived from the schema; only non-empty starting values are listed. Computed
// once at module load so the object stays referentially stable for React.
const DEFAULT_VALUES = buildDefaultValues(RAW_FIELDS, {
  orderDate: new Date().toISOString().split('T')[0],
  status: 'pending',
});

/**
 * `status` used to be cast straight out of form state. A schema change or a
 * stale saved draft could therefore put any string into a typed union field
 * and send it to the API; now anything unrecognised falls back to the initial
 * state instead.
 */
function toOrderStatus(value: FieldValue): OrderStatus {
  const candidate = asInputValue(value);
  return ORDER_STATUSES.find((status) => status === candidate) ?? 'pending';
}

function toNewOrder(data: FormValues): NewOrder {
  return {
    orderId: asInputValue(data.orderId),
    customerName: asInputValue(data.customerName),
    orderDate: asInputValue(data.orderDate),
    totalAmount: asNumber(data.totalAmount),
    status: toOrderStatus(data.status),
  };
}

export default function OrderForm() {
  const createOrder = useCreateOrder();

  // These receive whatever the field holds, not a guaranteed string — the
  // schema decides which field each is attached to. Narrow, then work.
  // These demonstrate the schema's `onCustomChange` / `onCustomBlur` hooks
  // firing. They go to the app's own log (visible on the admin error-log page)
  // rather than the console, so nothing debug-shaped ships in the bundle.
  const handleCustomerNameChange = useCallback((value: FieldValue) => {
    logInfo({
      fileName: SOURCE_FILE,
      lineNumber: null,
      apiEndpoint: null,
      httpMethod: null,
      error: 'FIELD_CHANGED',
      errorDescription: 'customerName changed',
      context: { formName: FORM_NAME, field: 'customerName', value: asInputValue(value) },
    });
  }, []);

  const handleCustomerNameBlur = useCallback((value: FieldValue) => {
    logInfo({
      fileName: SOURCE_FILE,
      lineNumber: null,
      apiEndpoint: null,
      httpMethod: null,
      error: 'FIELD_BLURRED',
      errorDescription: 'customerName blurred',
      context: { formName: FORM_NAME, field: 'customerName', value: asInputValue(value) },
    });
  }, []);

  const nameValidation = useCallback((value: FieldValue) => {
    const name = asInputValue(value);
    if (!name) return 'Customer name is required';
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return 'Customer name should only contain letters';
    }
    return true;
  }, []);

  const registry = useMemo<HandlerRegistry>(
    () => ({ nameValidation, handleCustomerNameChange, handleCustomerNameBlur }),
    [nameValidation, handleCustomerNameChange, handleCustomerNameBlur],
  );

  const fields = useMemo(
    () => resolveFields(RAW_FIELDS, registry, { sourceFile: SOURCE_FILE, formName: FORM_NAME }),
    [registry],
  );

  const handleSubmit = useCallback(
    async (data: FormValues) => {
      const created = await createOrder.mutateAsync(toNewOrder(data));
      snackbar.success(`Order "${created.orderId}" submitted successfully!`, {
        action: {
          label: 'TRACK',
          onClick: () => {
            // TODO: navigate to order tracking once a route exists.
            logInfo({
              fileName: SOURCE_FILE,
              lineNumber: null,
              apiEndpoint: null,
              httpMethod: null,
              error: 'TRACK_ORDER_REQUESTED',
              errorDescription: `Tracking requested for order ${created.orderId}`,
              context: { formName: FORM_NAME, orderId: created.orderId },
            });
          },
        },
      });
    },
    [createOrder],
  );

  const handleError = useCallback((errors: unknown) => {
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
        Order Form
      </Typography>

      {/* `blocking` demonstrates the full-page spinner variant; ProductForm
          leaves it unset and gets the in-button spinner instead. */}
      <SchemaFormWrapper
        schema={formSchema}
        submitButtonLabel="Create Order"
        defaultValues={DEFAULT_VALUES}
        blocking
        blockingMessage="Submitting order…"
        defaultDebounceMs={250}
        sourceFile={SOURCE_FILE}
        formName={FORM_NAME}
        apiEndpoint={API_ENDPOINT}
        httpMethod={HTTP_METHOD}
      />
    </div>
  );
}
