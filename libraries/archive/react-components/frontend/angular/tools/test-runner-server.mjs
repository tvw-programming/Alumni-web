/**
 * Dev-only HTTP endpoint that runs the unit test suite on demand.
 *
 * ## Why a separate process
 *
 * The React app registers this as Vite middleware from inside its own config.
 * Angular's application builder exposes no equivalent hook — there is no
 * supported way to add dev-server middleware — so the endpoint runs beside the
 * dev server and `proxy.conf.json` forwards `/__run-unit-tests` to it. The
 * browser still sees one origin, so no CORS and no second URL to know about.
 *
 * ## Safety
 *
 * This executes a shell command on request, so it must never be reachable from
 * a deployed build. Three things keep it that way: it is started only by
 * `pnpm start`, it binds to loopback, and nothing proxies to it in a production
 * build. The admin UI additionally hides the button outside dev and behind the
 * `diagnostics:manage` capability, but those are conveniences — this file's own
 * constraints are what actually matter.
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';

const PORT = Number(process.env.TEST_RUNNER_PORT ?? 4300);
const RUN_ENDPOINT = '/__run-unit-tests';
const REPORT_ENDPOINT = '/test-report.json';
const REPORT_PATH = resolve(process.cwd(), '.test-output/test-report.json');

/** One run at a time: concurrent runs would race on `public/test-report.json`. */
let inFlight = null;

function runTests() {
  if (inFlight) return inFlight;

  const startedAt = Date.now();
  inFlight = new Promise((resolve) => {
    // `ng test --watch=false` writes the report through the Vitest reporter
    // configured in angular.json.
    const child = spawn('pnpm', ['exec', 'ng', 'test', '--watch=false'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });

    child.on('close', (exitCode) => {
      inFlight = null;
      resolve({
        ok: exitCode === 0,
        exitCode: exitCode ?? -1,
        durationMs: Date.now() - startedAt,
        message:
          exitCode === 0 ? undefined : 'The suite reported failures. See the list below.',
      });
    });

    child.on('error', (error) => {
      inFlight = null;
      resolve({
        ok: false,
        exitCode: -1,
        durationMs: Date.now() - startedAt,
        message: `Could not start the test runner: ${error.message}`,
      });
    });
  });

  return inFlight;
}

const server = createServer((request, response) => {
  const url = request.url ?? '';

  // Serve the report from outside `public/`, so writing it never trips the
  // dev server's file watcher. `no-store` because the whole point of the
  // Refresh button is to see a newer file than the one already fetched.
  if (request.method === 'GET' && url.startsWith(REPORT_ENDPOINT)) {
    void readFile(REPORT_PATH, 'utf8').then(
      (contents) => {
        response.writeHead(200, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        });
        response.end(contents);
      },
      () => {
        // No run yet is a normal state, not an error.
        response.writeHead(404, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ message: 'No test report yet. Run the suite.' }));
      },
    );
    return;
  }

  if (request.method === 'POST' && url.startsWith(RUN_ENDPOINT)) {
    void runTests().then((result) => {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(result));
    });
    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ message: 'Not found' }));
});

// Loopback only. This runs a shell command; it has no business on a network
// interface even in development.
server.listen(PORT, '127.0.0.1', () => {
  console.log(`[test-runner] POST http://127.0.0.1:${PORT}${RUN_ENDPOINT}`);
  console.log(`[test-runner] GET  http://127.0.0.1:${PORT}${REPORT_ENDPOINT}`);
});
