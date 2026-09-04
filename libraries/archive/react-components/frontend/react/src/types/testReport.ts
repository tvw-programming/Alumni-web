/**
 * Shape of `public/test-report.json`, written by `src/test/logReporter.ts` on
 * every `pnpm test` run and read by the admin console's Unit tests tab.
 *
 * Test results only exist at build time, so this file is the hand-off: the
 * reporter is the only writer, the admin tab is the only reader, and this type
 * is the contract between them.
 */

export interface TestFailure {
  /** Project-relative module path, e.g. `src/utils/errors.test.ts`. */
  file: string;
  /** Parent suite chain, `>`-joined. Empty when the test is at module level. */
  suite: string;
  /** Test name without the suite prefix. */
  name: string;
  /** Assertion or thrown-error message. */
  message: string;
  /** Error constructor name, e.g. `AssertionError`. */
  errorName: string;
  /** Formatted expected/actual diff when the runner produced one. */
  diff: string | null;
  /** First frames of the stack, newline-joined. */
  stack: string | null;
  durationMs: number | null;
}

export interface TestReport {
  /** ISO-8601 timestamp of the run. */
  generatedAt: string;
  /** `passed` when the run had no failures and no unhandled errors. */
  status: 'passed' | 'failed';
  durationMs: number;
  totals: {
    files: number;
    tests: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  failures: TestFailure[];
  /** Errors thrown outside any test (import crashes, hook failures). */
  unhandledErrors: string[];
}
