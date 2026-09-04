/**
 * Dev-server endpoint that runs the unit suite on demand.
 *
 * The admin console's "Run unit tests" button posts here; this spawns Vitest,
 * which rewrites `public/test-report.json` through `logReporter.ts`, and the tab
 * refetches that artifact. The browser cannot spawn a process, so the run has to
 * happen on the server side of the dev server.
 *
 * `apply: 'serve'` means this never exists in a production build — there is no
 * Node process to host it, and shipping an HTTP endpoint that executes a command
 * would be indefensible. The button is likewise dev-only in the UI.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Plugin } from 'vite';

export const RUN_TESTS_ENDPOINT = '/__run-unit-tests';

/** Cap on captured output so a noisy run cannot exhaust memory. */
const MAX_OUTPUT_CHARS = 20_000;

export interface RunTestsResponse {
  /** Vitest's exit code: 0 when the suite passed, non-zero when it failed. */
  exitCode: number;
  durationMs: number;
  /** Tail of combined stdout/stderr, for surfacing a crash the report cannot describe. */
  output: string;
  /** Set when the run could not be started at all. */
  error?: string;
}

/** Prefer the locally installed binary so the endpoint does not depend on a package manager being on PATH. */
function resolveVitestBin(root: string): string | null {
  const local = resolve(root, 'node_modules/.bin/vitest');
  return existsSync(local) ? local : null;
}

export function runTestsPlugin(): Plugin {
  // One run at a time: concurrent Vitest processes would race on the report file.
  let inFlight: Promise<RunTestsResponse> | null = null;

  return {
    name: 'run-unit-tests-endpoint',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(RUN_TESTS_ENDPOINT, (req, res) => {
        if (req.method !== 'POST') {
          // Writing the status onto the response object is how Node's HTTP API
          // works; the lint rule against parameter mutation does not fit here.
          res.writeHead(405, { Allow: 'POST' });
          res.end('Use POST');
          return;
        }

        const root = server.config.root;
        inFlight ??= runVitest(root).finally(() => {
          inFlight = null;
        });

        void inFlight.then((result) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        });
      });
    },
  };
}

function runVitest(root: string): Promise<RunTestsResponse> {
  const startedAt = Date.now();
  const bin = resolveVitestBin(root);

  if (!bin) {
    return Promise.resolve({
      exitCode: 1,
      durationMs: 0,
      output: '',
      error: 'Could not find node_modules/.bin/vitest. Run `pnpm install` first.',
    });
  }

  return new Promise<RunTestsResponse>((resolvePromise) => {
    // `run` (not watch) so the process exits and the report is final. The
    // reporters configured in vite.config.ts still apply, so this writes the
    // same artifact a manual `pnpm test` does.
    const child = spawn(bin, ['run'], { cwd: root, env: process.env });

    let output = '';
    const collect = (chunk: Buffer) => {
      output = `${output}${chunk.toString()}`.slice(-MAX_OUTPUT_CHARS);
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);

    child.on('error', (error) => {
      resolvePromise({
        exitCode: 1,
        durationMs: Date.now() - startedAt,
        output,
        error: error.message,
      });
    });

    child.on('close', (code) => {
      resolvePromise({
        // A failing suite is a successful run of this endpoint — the failures
        // belong in the report, not in an HTTP error.
        exitCode: code ?? 1,
        durationMs: Date.now() - startedAt,
        output,
      });
    });
  });
}
