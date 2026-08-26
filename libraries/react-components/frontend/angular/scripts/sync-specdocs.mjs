/**
 * Publishes the specification documents so the Documentation pages can fetch
 * them, and builds the tree manifest the navigator renders.
 *
 * The documents live beside the code they describe (`specDoc/` in each package),
 * which is what keeps them getting updated. The browser cannot read those paths,
 * so this copies them into `public/specdoc/` and writes one manifest.
 *
 * Runs from `prestart` and `prebuild`, so a spec edit is visible on the next start
 * without anyone having to remember a step.
 *
 * Two sets are published:
 *   ui   → this app's own specDoc  (frontend/angular/specDoc)
 *   api  → the Go API's specDoc    (api/specDoc)
 */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const repoRoot = resolve(appRoot, '../..');

const SETS = [
  { id: 'ui', label: 'Spec Doc', source: join(appRoot, 'specDoc') },
  { id: 'api', label: 'API Spec Doc', source: join(repoRoot, 'api/specDoc') },
  { id: 'api-spring', label: 'Spring API Spec Doc', source: join(repoRoot, 'api-spring/specDoc') },
];

const OUTPUT = join(appRoot, 'public/specdoc');

/** First `# …` or `## …` in the file, falling back to the filename. */
async function titleOf(file, fallback) {
  const text = await readFile(file, 'utf8');
  const heading = /^#{1,2}\s+(.+)$/m.exec(text);
  if (!heading) return fallback;
  const title = heading[1].trim();
  // Every component spec opens with the same boilerplate heading, so the useful
  // title is the opening of the "### Name & Purpose" paragraph.
  if (title === 'Component Specification') {
    const name = /###\s+Name & Purpose\s*\n+([\s\S]*?)(?:\n\s*\n|$)/.exec(text);
    if (name) {
      // The whole paragraph, not its first line: these are hard-wrapped, so the
      // em dash or full stop that ends the name often falls on line two.
      const paragraph = name[1].replace(/[`*]/g, '').replace(/\s+/g, ' ').trim();
      const cleaned = paragraph.split(/\s—\s|\.\s/)[0].trim();
      if (cleaned) return shorten(cleaned);
    }
  }
  return title;
}

/**
 * Keeps a tree label to one line's worth of text.
 *
 * A spec whose opening sentence runs long would otherwise put a paragraph in
 * the navigator. The filename is shown underneath either way, so trimming
 * costs nothing.
 */
function shorten(text, limit = 64) {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const boundary = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','));
  return `${cut.slice(0, boundary > 24 ? boundary : limit).replace(/[,;:]$/, '')}…`;
}

async function walk(dir, base) {
  const entries = await readdir(dir, { withFileTypes: true });
  const children = [];

  for (const entry of [...entries].sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      children.push({
        type: 'folder',
        name: entry.name,
        path: relative(base, full).split('\\').join('/'),
        children: await walk(full, base),
      });
    } else if (entry.name.endsWith('.md')) {
      const info = await stat(full);
      children.push({
        type: 'file',
        name: entry.name,
        path: relative(base, full).split('\\').join('/'),
        title: await titleOf(full, entry.name.replace(/\.md$/, '')),
        bytes: info.size,
      });
    }
  }

  // Folders first, then files — a tree reads better that way.
  return children.sort((a, b) => (a.type === b.type ? 0 : a.type === 'folder' ? -1 : 1));
}

function countFiles(nodes) {
  return nodes.reduce(
    (total, node) => total + (node.type === 'file' ? 1 : countFiles(node.children)),
    0,
  );
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUTPUT, { recursive: true });

  const manifest = { generatedAt: new Date().toISOString(), sets: [] };

  for (const set of SETS) {
    const target = join(OUTPUT, set.id);

    if (await exists(set.source)) {
      // Replace the set rather than merging into it, so a deleted spec really
      // disappears instead of lingering from the previous run.
      await rm(target, { recursive: true, force: true });
      await cp(set.source, target, { recursive: true });
    } else if (await exists(target)) {
      // The source is out of reach but a previous run already published this
      // set. That is the normal case inside Docker, whose build context is this
      // app's folder alone — `api/specDoc` sits outside it. Keeping what is
      // there is what makes API Spec Doc work in the container; wiping it would
      // silently ship an empty section.
      console.warn(`[specdoc] ${set.id}: source unavailable, keeping the published copy`);
    } else {
      console.warn(`[specdoc] skipped ${set.id}: ${set.source} does not exist`);
      continue;
    }

    const tree = await walk(target, target);
    manifest.sets.push({ id: set.id, label: set.label, tree, fileCount: countFiles(tree) });
    console.log(`[specdoc] ${set.id}: ${countFiles(tree)} documents`);
  }

  await writeFile(join(OUTPUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

await main();
