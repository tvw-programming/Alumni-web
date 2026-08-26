/**
 * Client for the dev-only endpoint in `src/test/runTestsPlugin.ts`.
 *
 * Deliberately uses `fetch` rather than the shared Axios client: this is not the
 * application API, it has no base URL, auth or correlation semantics, and it must
 * not appear in the API error channel when it is simply unavailable in a
 * production build.
 */
import type { RunTestsResponse } from '@/test/runTestsPlugin';

const RUN_TESTS_ENDPOINT = '/__run-unit-tests';

/** The endpoint only exists while the Vite dev server is hosting the app. */
export function canRunTests(): boolean {
  return import.meta.env.DEV;
}

export async function runUnitTests(): Promise<RunTestsResponse> {
  const response = await fetch(RUN_TESTS_ENDPOINT, { method: 'POST' });

  if (!response.ok) {
    throw new Error(
      `The test runner endpoint returned ${String(response.status)}. It exists only under \`pnpm dev\`.`,
    );
  }

  return (await response.json()) as RunTestsResponse;
}
