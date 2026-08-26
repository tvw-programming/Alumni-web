/**
 * Vitest reporter that writes `.test-output/test-report.json` after every run.
 *
 * Test results exist only at build time, so the admin console cannot observe
 * them directly — this file is the hand-off. It is the only writer of the
 * artifact; `src/types/testReport.ts` is the contract; the Unit tests tab is
 * the only reader.
 *
 * Runs in Node (not the browser), so it may use `node:fs`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

import type { TestFailure, TestReport } from '../app/core/errors/test-report.types';
import type { Reporter, TestCase, TestModule } from 'vitest/node';

/**
 * Deliberately NOT in `public/`.
 *
 * The dev server watches that directory, so writing the report there triggered
 * a live reload *while the run was still in progress* — the page reset and the
 * operator lost the tab they were watching. Writing outside it keeps the run
 * invisible to the builder; `tools/test-runner-server.mjs` serves the file to
 * the browser instead.
 *
 * It also means test results, a development diagnostic, never ship in a
 * production bundle.
 */
const OUTPUT_PATH = resolve(process.cwd(), '.test-output/test-report.json');

function firstFrames(stack: string | undefined, count = 6): string | null {
  if (!stack) return null;
  return stack.split('\n').slice(0, count).join('\n');
}

/** Vitest attaches expected/actual to assertion errors; render them as a diff block. */
function formatDiff(error: { expected?: unknown; actual?: unknown }): string | null {
  if (error.expected === undefined && error.actual === undefined) return null;
  const show = (value: unknown) => {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };
  return `- expected: ${show(error.expected)}\n+ actual:   ${show(error.actual)}`;
}

function suiteChain(test: TestCase): string {
  const names: string[] = [];
  let parent = test.parent;
  while (parent.type === 'suite') {
    names.unshift(parent.name);
    parent = parent.parent;
  }
  return names.join(' > ');
}

function toFailure(test: TestCase, moduleFile: string): TestFailure[] {
  const result = test.result();
  if (result.state !== 'failed') return [];
  const diagnostic = test.diagnostic();

  return result.errors.map((error) => ({
    file: moduleFile,
    suite: suiteChain(test),
    name: test.name,
    message: error.message,
    errorName: error.name ?? 'Error',
    diff: formatDiff(error),
    stack: firstFrames(error.stack),
    durationMs: diagnostic?.duration ?? null,
  }));
}

/**
 * Registered in `vite.config.ts` alongside the default reporter, so normal test
 * output is unchanged and the artifact is a side effect.
 */
export default class ErrorLogReporter implements Reporter {
  onTestRunEnd(
    testModules: readonly TestModule[],
    unhandledErrors: readonly { message?: string }[],
  ): void {
    const failures: TestFailure[] = [];
    const totals = { files: testModules.length, tests: 0, passed: 0, failed: 0, skipped: 0 };
    let durationMs = 0;

    for (const testModule of testModules) {
      const file = relative(process.cwd(), testModule.moduleId);
      durationMs += testModule.diagnostic().duration;

      for (const test of testModule.children.allTests()) {
        totals.tests += 1;
        const state = test.result().state;
        if (state === 'passed') totals.passed += 1;
        else if (state === 'failed') totals.failed += 1;
        else if (state === 'skipped') totals.skipped += 1;
        failures.push(...toFailure(test, file));
      }
    }

    const report: TestReport = {
      generatedAt: new Date().toISOString(),
      status: totals.failed === 0 && unhandledErrors.length === 0 ? 'passed' : 'failed',
      durationMs: Math.round(durationMs),
      totals,
      failures,
      unhandledErrors: unhandledErrors.map((error) => error.message ?? 'Unknown error'),
    };

    try {
      mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
      writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    } catch {
      // A test run must not fail because the artifact could not be written.
    }
  }
}
