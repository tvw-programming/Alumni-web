/**
 * Generates the domain-component catalogue as static files under `public/`.
 *
 * Why this is not an `import.meta.glob` any more: the registry used to inline
 * every component's source, README and sample JSON into the bundle with
 * `{ eager: true, query: '?raw' }`. That produced a 756 KB chunk (189 KB gzip)
 * which, because the Master Data sidebar renders the component tree, was
 * downloaded on *every* Master Data page — pages that display none of it.
 *
 * Static files fetched on demand cost the bundle nothing. The index is small
 * enough to fetch once; the heavy text is fetched only when someone opens the
 * tab that shows it.
 *
 * This runs at `predev` and `prebuild`, the same slot as `sync-specdocs.mjs`.
 * It cannot run at container start: the runtime image is nginx with no Node in
 * it, and by then the bundle is already built.
 *
 * The classification and summary rules are *imported* from the library rather
 * than reimplemented here, so this script and the coverage test can never
 * disagree about what a component is.
 */
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { summaryOf } from '../../../packages/ui/src/componentSummary.ts';
import { DOMAINS } from '../../../packages/ui/src/domainMeta.ts';
import {
  SAMPLE_VARIANTS,
  sampleImageSvg,
} from '../../../packages/ui/src/foundation/domainMotifs.ts';
import { resolveDomainVisuals } from '../../../packages/ui/src/foundation/domainVisuals.ts';
import { classifySurface } from '../../../packages/ui/src/surfaceTier.ts';

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(dirname(appRoot));
const domainsRoot = join(repoRoot, 'packages/ui/src/domains');
const publicRoot = join(appRoot, 'public');
const payloadRoot = join(publicRoot, 'domain-components');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readOptional(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

async function build() {
  if (!(await exists(domainsRoot))) {
    console.warn(`[catalogue] no domains at ${domainsRoot} — skipping`);
    return;
  }

  // Rebuilt from scratch: a component deleted from the library must disappear
  // from `public/` too, or the gallery keeps serving a page for something that
  // no longer exists.
  await rm(payloadRoot, { recursive: true, force: true });

  const components = [];
  const domainIds = (await readdir(domainsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const domainId of domainIds) {
    const domainPath = join(domainsRoot, domainId);
    const names = (await readdir(domainPath, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const name of names) {
      const folder = join(domainPath, name);
      const readme = await readOptional(join(folder, 'README.md'));
      const source = await readOptional(join(folder, `${name}.tsx`));
      // A folder without both is incomplete rather than a component; the
      // registry skips it for the same reason.
      if (readme === null || source === null) continue;

      const usage = await readOptional(join(folder, 'usage.tsx'));
      const sample = await readOptional(join(folder, 'sample.json'));

      components.push({
        id: `${domainId}/${name}`,
        name,
        domainId,
        summary: summaryOf(readme, source, name),
        surfaceTier: classifySurface(name, source),
      });

      const target = join(payloadRoot, domainId, name);
      await mkdir(target, { recursive: true });
      await Promise.all([
        writeFile(join(target, 'README.md'), readme),
        // `.txt`, not `.tsx`: these are served to be *displayed*, and a static
        // host handing back `text/plain` is exactly what the viewer wants.
        writeFile(join(target, 'source.txt'), source),
        usage === null ? Promise.resolve() : writeFile(join(target, 'usage.txt'), usage),
        sample === null ? Promise.resolve() : writeFile(join(target, 'sample.json'), sample),
      ]);
    }
  }

  // Sample imagery, one set per domain that actually has components. Generated
  // rather than committed: they are derived entirely from the domain's hue and
  // motif, so a change to either would otherwise leave stale files behind.
  const sampleRoot = join(payloadRoot, '_samples');
  await mkdir(sampleRoot, { recursive: true });
  let sampleCount = 0;
  for (const domainId of new Set(components.map((entry) => entry.domainId))) {
    const visuals = resolveDomainVisuals(domainId);
    for (let variant = 0; variant < SAMPLE_VARIANTS; variant += 1) {
      await writeFile(
        join(sampleRoot, `${domainId}-${String(variant)}.svg`),
        sampleImageSvg(visuals.motif, visuals.hue, variant),
      );
      sampleCount += 1;
    }
  }

  components.sort((a, b) => a.name.localeCompare(b.name));

  const populated = new Set(components.map((entry) => entry.domainId));
  const known = new Set(DOMAINS.map((domain) => domain.id));
  const domains = [
    ...DOMAINS,
    // A domain folder with no entry in the table still appears, under its own
    // name — a new domain is never invisible because someone forgot to label it.
    ...[...populated].filter((id) => !known.has(id)).map((id) => ({ id, label: id, description: '' })),
  ].filter((domain) => populated.has(domain.id));

  await mkdir(publicRoot, { recursive: true });
  await writeFile(
    join(publicRoot, 'domain-catalogue.json'),
    `${JSON.stringify({ domains, components }, null, 2)}\n`,
  );

  const unclassified = components.filter((entry) => entry.surfaceTier === null);
  if (unclassified.length > 0) {
    console.warn(
      `[catalogue] ${String(unclassified.length)} component(s) could not be classified: ${unclassified
        .map((entry) => entry.id)
        .join(', ')}`,
    );
  }

  console.log(
    `[catalogue] ${String(components.length)} components across ${String(domains.length)} domains, ` +
      `${String(sampleCount)} sample images`,
  );
}

await build();
