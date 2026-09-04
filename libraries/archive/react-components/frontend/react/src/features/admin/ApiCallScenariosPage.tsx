import CancelIcon from '@mui/icons-material/Cancel';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import DataObjectIcon from '@mui/icons-material/DataObject';
import SecurityIcon from '@mui/icons-material/Security';
import SyncIcon from '@mui/icons-material/Sync';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { PROJECT_HEADER } from '@/api/axiosClient';
import { ApiScenarioCard } from '@/components/api';
import { GenericCard } from '@/components/GenericCard';
import {
  scenarioProductOptions,
  useCancelablePost,
  useCancelScenarioPost,
  useOptimisticProductTitle,
  useProductPage,
} from '@/hooks/useApiScenarios';
import { getUserMessage, normalizeError } from '@/utils/errors';

function queryStatus(isPending: boolean, isError: boolean, hasData: boolean) {
  if (isPending) return 'pending' as const;
  if (isError) return 'error' as const;
  if (hasData) return 'success' as const;
  return 'idle' as const;
}

/** Architecture overview plus focused cancellation, pagination, and optimistic-cache scenarios. */
export function ApiCallScenariosPage() {
  const [page, setPage] = useState(0);
  const [cancelEnabled, setCancelEnabled] = useState(false);
  const pageQuery = useProductPage(page, 4);
  const cancelQuery = useCancelablePost(cancelEnabled);
  const cancelPost = useCancelScenarioPost();
  const optimisticSource = useQuery(scenarioProductOptions(1));
  const optimisticTitle = useOptimisticProductTitle();

  return (
    <Stack spacing={3} pb={3}>
      <Stack spacing={0.5}>
        <Typography variant="h5">API Call Scenarios</Typography>
        <Typography color="text.secondary">
          The UI consumes typed query state while Axios, authentication, headers, cancellation, and
          error normalization remain below the component layer.
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        <GenericCard
          header={{
            title: 'HTTP client',
            icon: <SecurityIcon />,
            badge: <Chip label="Axios" size="small" />,
          }}
          appearance={{ surface: 'glass' }}
        >
          <Stack spacing={1}>
            <Typography variant="body2">15-second timeout and normalized failures.</Typography>
            <Typography variant="body2">
              Bearer injection and single-flight token refresh support.
            </Typography>
            <Chip
              label={`${PROJECT_HEADER.key}: ${PROJECT_HEADER.value}`}
              color="primary"
              size="small"
            />
          </Stack>
        </GenericCard>
        <GenericCard header={{ title: 'Query layer', icon: <DataObjectIcon /> }}>
          <Typography variant="body2">
            Hierarchical keys, `queryOptions`, bounded retries, exponential backoff, cache
            invalidation, pagination builders, and consumed AbortSignals.
          </Typography>
        </GenericCard>
        <GenericCard
          header={{ title: 'Reference guidance', icon: <CloudDoneIcon /> }}
          appearance={{ surface: 'subtle' }}
        >
          <Stack spacing={0.5}>
            <Link
              href="https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation"
              target="_blank"
              rel="noreferrer"
            >
              Cancellation
            </Link>
            <Link
              href="https://tanstack.com/query/latest/docs/framework/react/guides/parallel-queries"
              target="_blank"
              rel="noreferrer"
            >
              Parallel queries
            </Link>
            <Link
              href="https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates"
              target="_blank"
              rel="noreferrer"
            >
              Optimistic updates
            </Link>
          </Stack>
        </GenericCard>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        <ApiScenarioCard
          title="Typed pagination"
          description="Query keys include page inputs; the shared builder emits limit, skip, sorting, and filters."
          status={queryStatus(pageQuery.isPending, pageQuery.isError, pageQuery.data !== undefined)}
          result={
            pageQuery.data
              ? `Page ${page + 1}: ${pageQuery.data.products.map((product) => product.title).join(', ')}`
              : undefined
          }
          error={pageQuery.error ? getUserMessage(normalizeError(pageQuery.error)) : undefined}
          secondaryAction={
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                disabled={page === 0}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <Button
                size="small"
                disabled={
                  !pageQuery.data ||
                  pageQuery.data.skip + pageQuery.data.limit >= pageQuery.data.total
                }
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </Stack>
          }
        />

        <ApiScenarioCard
          title="Abort and manual cancellation"
          description="TanStack supplies an AbortSignal that is passed through the service and Axios wrapper."
          icon={<CancelIcon />}
          status={queryStatus(
            cancelQuery.isFetching,
            cancelQuery.isError,
            cancelQuery.data !== undefined,
          )}
          actionLabel="Start delayed call"
          onRun={() => setCancelEnabled(true)}
          result={cancelQuery.data?.title}
          error={cancelQuery.error ? getUserMessage(normalizeError(cancelQuery.error)) : undefined}
          secondaryAction={
            <Button
              size="small"
              color="error"
              disabled={!cancelQuery.isFetching}
              onClick={() => {
                void cancelPost().then(() => setCancelEnabled(false));
              }}
            >
              Cancel request
            </Button>
          }
        />

        <ApiScenarioCard
          title="Optimistic cache update"
          description="Cancels in-flight work, snapshots cache data, updates immediately, and invalidates after settling."
          icon={<SyncIcon />}
          status={queryStatus(
            optimisticSource.isPending || optimisticTitle.isPending,
            optimisticSource.isError || optimisticTitle.isError,
            optimisticSource.data !== undefined,
          )}
          actionLabel="Rename optimistically"
          onRun={() =>
            optimisticTitle.mutate({
              id: 1,
              title: `Optimistic title ${new Date().toLocaleTimeString()}`,
            })
          }
          result={optimisticSource.data?.title}
          error={
            optimisticSource.error || optimisticTitle.error
              ? getUserMessage(normalizeError(optimisticSource.error ?? optimisticTitle.error))
              : undefined
          }
        />
      </Box>
    </Stack>
  );
}
