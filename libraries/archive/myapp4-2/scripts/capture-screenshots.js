#!/usr/bin/env node
/**
 * Captures one screenshot per component across every domain in
 * src/components/ and writes them to <repo>/screenshots/<domain>-<Component>.jpg.
 *
 * Pipeline:
 *   1. Regenerate the screenshot registry (scripts/generate-screenshot-registry.js)
 *      so newly added components are picked up automatically.
 *   2. `expo export --platform web` the app once, with the harness root
 *      component active (EXPO_PUBLIC_SCREENSHOT_HARNESS=1), producing a
 *      static bundle that boots straight into src/screenshotHarness/HarnessApp.tsx.
 *   3. Serve that static export locally and drive it with Playwright,
 *      visiting `/?shot=<domain>-<Component>` for every entry in the
 *      generated manifest and screenshotting the `screenshot-target` node.
 *
 * A render failure in one component (e.g. a native-only module with no web
 * implementation) is caught by ScreenshotErrorBoundary and still produces a
 * labeled placeholder image — the run never aborts on a single failure, and
 * failures are called out in the summary printed at the end.
 *
 * Usage:  node scripts/capture-screenshots.js
 * Requires (already installed in this repo): react-native-web, react-dom,
 * playwright + its chromium browser (`npx playwright install chromium`).
 */
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WEB_EXPORT_DIR = path.join(ROOT, '.screenshot-web-export');
const SCREENSHOTS_DIR = path.join(ROOT, 'screenshots');
const MANIFEST_PATH = path.join(__dirname, 'screenshots-manifest.json');
const PORT = 4178;
const VIEWPORT = { width: 430, height: 932 };

function step(msg) {
  console.log(`\n▶ ${msg}`);
}

function regenerateRegistry() {
  step('Regenerating component registry…');
  execFileSync(process.execPath, [path.join(__dirname, 'generate-screenshot-registry.js')], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

function buildWebExport() {
  step('Building static web export of the screenshot harness (this takes a minute)…');
  fs.rmSync(WEB_EXPORT_DIR, { recursive: true, force: true });
  execFileSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', WEB_EXPORT_DIR], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, EXPO_PUBLIC_SCREENSHOT_HARNESS: '1' },
  });
}

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.map': 'application/json', '.ico': 'image/x-icon',
};

function serveStatic() {
  step(`Serving static export on http://localhost:${PORT} …`);
  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    let filePath = path.join(WEB_EXPORT_DIR, urlPath === '/' ? 'index.html' : urlPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(WEB_EXPORT_DIR, 'index.html'); // SPA fallback
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

async function captureAll() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  // Deferred require: playwright is only needed for this step, and failing
  // fast with a clear message beats a cryptic MODULE_NOT_FOUND mid-run.
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('\nPlaywright is not installed. Run:\n  npm install --save-dev playwright\n  npx playwright install chromium\n');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEWPORT });

  const failures = [];
  const succeeded = [];

  page.on('console', (msg) => {
    if (msg.text().includes('[screenshot:render-error]')) {
      console.warn(`  ⚠ ${msg.text()}`);
    }
  });

  step(`Capturing ${manifest.length} components…`);
  for (const [index, entry] of manifest.entries()) {
    const { key, fileName } = entry;
    const outPath = path.join(SCREENSHOTS_DIR, fileName);
    const progress = `[${index + 1}/${manifest.length}]`;
    try {
      await page.goto(`http://localhost:${PORT}/?shot=${encodeURIComponent(key)}`, {
        waitUntil: 'networkidle',
        timeout: 20000,
      });
      const target = page.locator('[data-testid="screenshot-target"]').first();
      await target.waitFor({ state: 'attached', timeout: 10000 });
      // Let fonts/icons/reanimated finish their first paint.
      await page.waitForTimeout(350);
      await target.screenshot({ path: outPath, type: 'jpeg', quality: 90 });
      console.log(`  ✓ ${progress} ${fileName}`);
      succeeded.push(key);
    } catch (err) {
      console.error(`  ✗ ${progress} ${fileName} — ${err.message.split('\n')[0]}`);
      failures.push({ key, error: err.message.split('\n')[0] });
    }
  }

  await browser.close();
  return { succeeded, failures, total: manifest.length };
}

async function main() {
  regenerateRegistry();
  buildWebExport();
  const server = await serveStatic();
  let result;
  try {
    result = await captureAll();
  } finally {
    server.close();
  }

  console.log('\n──────────────────────────────────────────');
  console.log(`Done. ${result.succeeded.length}/${result.total} screenshots written to ${path.relative(ROOT, SCREENSHOTS_DIR)}/`);
  if (result.failures.length > 0) {
    console.log(`${result.failures.length} render failure(s) (still captured as labeled placeholders):`);
    for (const f of result.failures) console.log(`  - ${f.key}: ${f.error}`);
  }
  console.log('──────────────────────────────────────────');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
