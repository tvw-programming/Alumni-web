import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CachedIcon from '@mui/icons-material/Cached';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SaveIcon from '@mui/icons-material/Save';
import StorageIcon from '@mui/icons-material/Storage';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import {
  ApiScenarioCard,
  FullscreenRequestOverlay,
  type ApiScenarioStatus,
} from '@/components/api';
import { snackbar } from '@/components/snackbar/snackbarBus';
import {
  useDependentApiScenario,
  useDelayedProductRequest,
  useParallelApiScenario,
  usePlainProductRequest,
  usePrefetchScenarioProduct,
  useRetryProductRequest,
  useScheduledApiScenario,
  useSequentialApiScenario,
} from '@/hooks/useApiScenarios';
import { apiScenarioStore, useApiScenarioRuns } from '@/store/apiScenarioStore';
import { getUserMessage, normalizeError } from '@/utils/errors';
import { safeLocalStorage } from '@/utils/safeStorage';

const LOCAL_RESULT_KEY = 'api-scenario.last-product';

function requestStatus(status: 'idle' | 'pending' | 'error' | 'success'): ApiScenarioStatus {
  return status;
}

function queryStatus(isFetching: boolean, isError: boolean, hasData: boolean): ApiScenarioStatus {
  if (isFetching) return 'pending';
  if (isError) return 'error';
  if (hasData) return 'success';
  return 'idle';
}

function errorMessage(error: unknown): string | undefined {
  return error ? getUserMessage(normalizeError(error)) : undefined;
}

/** Runnable catalog of request orchestration patterns; all transport details live below this page. */
export function ApiCallExamplesPage() {
  const plain = usePlainProductRequest();
  const retry = useRetryProductRequest();
  const [parallelEnabled, setParallelEnabled] = useState(false);
  const parallel = useParallelApiScenario(parallelEnabled);
  const sequential = useSequentialApiScenario();
  const [dependentEnabled, setDependentEnabled] = useState(false);
  const dependent = useDependentApiScenario(dependentEnabled);
  const fullscreen = useDelayedProductRequest();
  const iconSpinner = useDelayedProductRequest();
  const snackbarRequest = usePlainProductRequest();
  const expectedError = usePlainProductRequest();
  const storeRequest = usePlainProductRequest();
  const localRequest = usePlainProductRequest();
  const prefetchProduct = usePrefetchScenarioProduct();
  const [backgroundStatus, setBackgroundStatus] = useState<ApiScenarioStatus>('idle');
  const [localResult, setLocalResult] = useState(() => safeLocalStorage.get(LOCAL_RESULT_KEY));
  const storeRuns = useApiScenarioRuns();

  const parallelPending = parallel.some((result) => result.isFetching);
  const parallelError = parallel.find((result) => result.error)?.error;
  const parallelReady = parallel.every((result) => result.data !== undefined);

  return (
    <Stack spacing={3} pb={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5">API Call Examples</Typography>
        <Typography color="text.secondary">
          Thirteen runnable patterns using the same typed services, query keys, cancellation, cache,
          and normalized error contract.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        <ApiScenarioCard
          title="1. Plain API call"
          description="A typed mutation invokes a service without exposing Axios to the UI."
          status={requestStatus(plain.status)}
          onRun={() => plain.mutate(1)}
          result={plain.data ? `${plain.data.title} — $${plain.data.price}` : undefined}
          error={errorMessage(plain.error)}
          icon={<CloudDownloadIcon />}
        />

        <ApiScenarioCard
          title="2. API call with retry"
          description="A disabled query is manually run with two bounded retries and exponential backoff."
          status={queryStatus(retry.isFetching, retry.isError, retry.data !== undefined)}
          onRun={() => void retry.refetch()}
          result={retry.data?.title}
          error={errorMessage(retry.error)}
          icon={<CachedIcon />}
        />

        <ApiScenarioCard
          title="3. Parallel API calls"
          description="useQueries starts product, user, and todo requests together."
          status={queryStatus(parallelPending, parallelError !== undefined, parallelReady)}
          onRun={() => {
            if (parallelEnabled) void Promise.all(parallel.map((result) => result.refetch()));
            else setParallelEnabled(true);
          }}
          result={
            parallelReady
              ? `Product, user, and todo completed (${parallel.length} results).`
              : undefined
          }
          error={errorMessage(parallelError)}
        />

        <ApiScenarioCard
          title="4. Sequential API calls"
          description="Independent requests deliberately await in order inside one orchestration mutation."
          status={requestStatus(sequential.status)}
          onRun={() => sequential.mutate()}
          result={
            sequential.data
              ? `${sequential.data.product.title} → ${sequential.data.user.firstName} → ${sequential.data.todo.todo}`
              : undefined
          }
          error={errorMessage(sequential.error)}
          icon={<AccountTreeIcon />}
        />

        <ApiScenarioCard
          title="5. Sequential dependent calls"
          description="The second category query is enabled only after the first product supplies its category."
          status={queryStatus(
            dependent.productQuery.isFetching || dependent.categoryQuery.isFetching,
            dependent.productQuery.isError || dependent.categoryQuery.isError,
            dependent.categoryQuery.data !== undefined,
          )}
          onRun={() => {
            if (dependentEnabled) void dependent.productQuery.refetch();
            else setDependentEnabled(true);
          }}
          result={
            dependent.categoryQuery.data
              ? `${dependent.productQuery.data?.category}: ${dependent.categoryQuery.data.products.length} related products`
              : undefined
          }
          error={errorMessage(dependent.productQuery.error ?? dependent.categoryQuery.error)}
        />

        <ApiScenarioCard
          title="6. Fullscreen spinner"
          description="The reusable overlay is driven by parent-owned request state."
          status={requestStatus(fullscreen.status)}
          onRun={() => fullscreen.mutate(6)}
          result={fullscreen.data?.title}
          error={errorMessage(fullscreen.error)}
        />

        <ApiScenarioCard
          title="7. Icon spinner"
          description="ApiScenarioCard renders compact progress feedback inside its action button."
          status={requestStatus(iconSpinner.status)}
          onRun={() => iconSpinner.mutate(7)}
          result={iconSpinner.data?.title}
          error={errorMessage(iconSpinner.error)}
        />

        <ApiScenarioCard
          title="8. API call with snackbar"
          description="The parent decides when a successful application action should notify the user."
          status={requestStatus(snackbarRequest.status)}
          onRun={() =>
            snackbarRequest.mutate(8, {
              onSuccess: (product) => snackbar.success(`Loaded ${product.title}`),
            })
          }
          result={snackbarRequest.data?.title}
          error={errorMessage(snackbarRequest.error)}
          icon={<NotificationsActiveIcon />}
        />

        <ApiScenarioCard
          title="9. Standard error handling"
          description="A missing resource demonstrates normalized API errors and user-safe messaging."
          status={requestStatus(expectedError.status)}
          onRun={() => expectedError.mutate(0)}
          result={expectedError.data?.title}
          error={errorMessage(expectedError.error)}
          icon={<ErrorOutlineIcon />}
        />

        <ApiScenarioCard
          title="10. API call with store"
          description="A small external store records workflow history; server data remains in Query cache."
          status={requestStatus(storeRequest.status)}
          onRun={() =>
            storeRequest.mutate(10, {
              onSuccess: (product) =>
                apiScenarioStore.add({
                  label: 'Store request',
                  completedAt: new Date().toISOString(),
                  summary: product.title,
                }),
            })
          }
          result={
            storeRuns[0] ? `${storeRuns.length} run(s); latest: ${storeRuns[0].summary}` : undefined
          }
          error={errorMessage(storeRequest.error)}
          icon={<StorageIcon />}
          secondaryAction={
            <Button
              size="small"
              disabled={storeRuns.length === 0}
              onClick={() => apiScenarioStore.clear()}
            >
              Clear store
            </Button>
          }
        />

        <ApiScenarioCard
          title="11. API call with localStorage"
          description="The parent explicitly persists a selected result through the guarded storage utility."
          status={requestStatus(localRequest.status)}
          onRun={() =>
            localRequest.mutate(11, {
              onSuccess: (product) => {
                const serialized = JSON.stringify({ id: product.id, title: product.title });
                safeLocalStorage.set(LOCAL_RESULT_KEY, serialized);
                setLocalResult(serialized);
              },
            })
          }
          result={localResult ?? undefined}
          error={errorMessage(localRequest.error)}
          icon={<SaveIcon />}
          secondaryAction={
            <Button
              size="small"
              disabled={!localResult}
              onClick={() => {
                safeLocalStorage.remove(LOCAL_RESULT_KEY);
                setLocalResult(null);
              }}
            >
              Remove saved value
            </Button>
          }
        />

        <ApiScenarioCard
          title="12. Background non-blocking call"
          description="prefetchQuery warms the cache while the page remains interactive."
          status={backgroundStatus}
          onRun={() => {
            setBackgroundStatus('pending');
            void prefetchProduct(12).then(() => {
              setBackgroundStatus('success');
              snackbar.info('Background prefetch completed');
            });
          }}
          result="Product 12 is now available in the Query cache."
        />

        <SchedulerScenarioCard />
      </Box>

      <FullscreenRequestOverlay open={fullscreen.isPending} message="Loading fullscreen example…" />
    </Stack>
  );
}

/**
 * Owns the polling query so a 10-second tick re-renders this card only, and keeps
 * the card in `success` across background refetches so the result text updates in
 * place instead of the alert and button unmounting on every interval.
 */
function SchedulerScenarioCard() {
  const [enabled, setEnabled] = useState(false);
  const scheduled = useScheduledApiScenario(enabled, 10_000);
  const hasData = scheduled.data !== undefined;

  // Only the very first load is a pending state; later ticks refresh in the background.
  const status: ApiScenarioStatus = scheduled.isLoading
    ? 'pending'
    : hasData
      ? 'success'
      : scheduled.isError
        ? 'error'
        : 'idle';

  return (
    <ApiScenarioCard
      title="13. Internal scheduler"
      description="A 10-second refetch interval models browser polling; it pauses when this component unmounts."
      status={status}
      actionLabel={enabled ? 'Refresh now' : 'Start scheduler'}
      onRun={() => {
        if (enabled) void scheduled.refetch();
        else setEnabled(true);
      }}
      result={
        scheduled.data
          ? `${scheduled.data.title}; updated ${new Date(scheduled.dataUpdatedAt).toLocaleTimeString()}`
          : undefined
      }
      error={errorMessage(scheduled.error)}
      icon={<AccessTimeIcon />}
      secondaryAction={
        <>
          {enabled ? (
            <Button size="small" color="warning" onClick={() => setEnabled(false)}>
              Stop scheduler
            </Button>
          ) : (
            <Chip label="Stopped" size="small" />
          )}
          {/* Fixed-size slot so the refresh indicator never shifts the row. */}
          <Box
            width={16}
            height={16}
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            {scheduled.isFetching && !scheduled.isLoading && (
              <CircularProgress size={14} aria-label="Refreshing scheduled result" />
            )}
          </Box>
        </>
      }
    >
      {hasData && scheduled.isError ? (
        <Typography variant="caption" color="warning.main">
          Last refresh failed: {errorMessage(scheduled.error)} Showing the previous result until the
          next tick.
        </Typography>
      ) : undefined}
    </ApiScenarioCard>
  );
}
