import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { usePermission } from '@/auth/usePermission';
import { canRunTests, runUnitTests } from '@/services/testRunnerService';

import type { TestReport } from '@/types/testReport';

/** Where `src/test/logReporter.ts` writes the artifact, served from `public/`. */
const REPORT_URL = '/test-report.json';

function isTestReport(value: unknown): value is TestReport {
  if (typeof value !== 'object' || value === null) return false;
  const report = value as Partial<TestReport>;
  return typeof report.generatedAt === 'string' && Array.isArray(report.failures);
}

/**
 * Fetches the build-time artifact. A missing file is a normal state ("no run
 * yet"), not an error, so it resolves to `null` rather than throwing — that
 * keeps it out of the global query-error snackbar.
 */
async function fetchTestReport(signal: AbortSignal): Promise<TestReport | null> {
  const response = await fetch(REPORT_URL, { signal, cache: 'no-store' });
  if (!response.ok) return null;
  const parsed: unknown = await response.json();
  return isTestReport(parsed) ? parsed : null;
}

function FailureCard({ failure }: { failure: TestReport['failures'][number] }) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip size="small" color="error" label={failure.errorName} />
          <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
            {failure.suite ? `${failure.suite} > ` : ''}
            {failure.name}
          </Typography>
          {failure.durationMs != null && (
            <Chip size="small" variant="outlined" label={`${String(failure.durationMs)}ms`} />
          )}
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          {failure.file}
        </Typography>

        <Typography variant="body2">{failure.message}</Typography>

        {(failure.diff ?? failure.stack) && (
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1.5,
              fontSize: 12,
              lineHeight: 1.6,
              bgcolor: 'action.hover',
              borderRadius: 1,
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {[failure.diff, failure.stack].filter(Boolean).join('\n\n')}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

/**
 * Unit-test failures from the last `pnpm test` run.
 *
 * Test results exist only at build time, so unlike the other two tabs this one
 * reads a file rather than the live log: `src/test/logReporter.ts` writes
 * `public/test-report.json` on every run, and this tab renders it.
 */
export function TestErrorsTab() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.testReport,
    queryFn: ({ signal }) => fetchTestReport(signal),
    staleTime: 0,
    retry: false,
  });

  const run = useMutation({
    mutationFn: runUnitTests,
    // A failing suite is a successful run — the failures belong in the report,
    // so refetch either way. `invalidateQueries` re-reads the artifact Vitest
    // just rewrote, which is what updates the "run at" timestamp.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.testReport }),
    meta: { silenceGlobalError: true },
  });

  const report = query.data ?? null;
  const running = run.isPending;
  // Running the suite spawns a process on the dev host; that is maintenance,
  // not reading.
  const canRun = usePermission('diagnostics:manage');

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Failures from the most recent run, read from <code>public/test-report.json</code>. The
        artifact is written by the reporter registered in <code>vite.config.ts</code>, so it
        refreshes whenever the suite runs — from the button here, from <code>pnpm test</code>, or in
        CI. Running from here needs the dev server, so the button is absent from production builds.
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {report && (
          <>
            <Chip
              color={report.status === 'passed' ? 'success' : 'error'}
              label={report.status === 'passed' ? 'passing' : 'failing'}
            />
            <Chip variant="outlined" label={`${String(report.totals.passed)} passed`} />
            <Chip
              variant="outlined"
              color="error"
              label={`${String(report.totals.failed)} failed`}
            />
            <Chip variant="outlined" label={`${String(report.totals.skipped)} skipped`} />
            <Chip variant="outlined" label={`${String(report.totals.files)} files`} />
            <Chip variant="outlined" label={`${String(Math.round(report.durationMs))}ms`} />
            <Typography variant="caption" color="text.secondary">
              run {new Date(report.generatedAt).toLocaleString()}
            </Typography>
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button startIcon={<RefreshIcon />} onClick={() => void query.refetch()} disabled={running}>
          Refresh
        </Button>
        {canRunTests() && canRun && (
          <Button
            variant="contained"
            startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
            onClick={() => {
              run.mutate();
            }}
            disabled={running}
          >
            {running ? 'Running…' : 'Run unit tests'}
          </Button>
        )}
      </Stack>

      {running && (
        <Alert severity="info" variant="outlined" icon={<CircularProgress size={16} />}>
          Running the full suite. The report and its timestamp update when it finishes.
        </Alert>
      )}

      {run.isError && (
        <Alert severity="error" variant="outlined">
          <AlertTitle>Could not start the test run</AlertTitle>
          {run.error.message}
        </Alert>
      )}

      {/* The endpoint reports its own failure to start separately from a suite
          that simply failed — the latter is a normal outcome with a report. */}
      {run.data?.error !== undefined && (
        <Alert severity="error" variant="outlined">
          <AlertTitle>The test runner could not start</AlertTitle>
          {run.data.error}
        </Alert>
      )}

      {run.data && run.data.error === undefined && (
        <Alert severity={run.data.exitCode === 0 ? 'success' : 'warning'} variant="outlined">
          Run finished in {(run.data.durationMs / 1000).toFixed(1)}s with exit code{' '}
          {String(run.data.exitCode)}.
        </Alert>
      )}

      {query.isLoading && <Typography color="text.secondary">Loading report…</Typography>}

      {!query.isLoading && report === null && (
        <Alert severity="info" variant="outlined">
          <AlertTitle>No test report yet</AlertTitle>
          Run <code>pnpm test</code> to generate <code>public/test-report.json</code>, then press
          Refresh. In CI, publish the same file with the build so this tab reflects the pipeline.
        </Alert>
      )}

      {report?.unhandledErrors.map((message, index) => (
        <Alert key={index} severity="error" variant="outlined">
          <AlertTitle>Unhandled error outside a test</AlertTitle>
          {message}
        </Alert>
      ))}

      {report && report.failures.length === 0 && report.unhandledErrors.length === 0 && (
        <Alert severity="success" variant="outlined">
          All {report.totals.tests} tests passed in the last run.
        </Alert>
      )}

      {report?.failures.map((failure, index) => (
        <FailureCard key={`${failure.file}-${failure.name}-${String(index)}`} failure={failure} />
      ))}
    </Stack>
  );
}
