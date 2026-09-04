import { describe, expect, it } from 'vitest';

import { DOMAIN_VISUALS } from './foundation/domainVisuals';
import { summaryOf } from './componentSummary';
import { classifySurface, needsDomainSurface, type SurfaceTier } from './surfaceTier';

/**
 * Coverage verification, as a failing test rather than a spot-check.
 *
 * Domain theming reaches a component through scoped CSS, which can only match a
 * surface the component actually renders. This test classifies every component
 * in the library and asserts that each one lands in a tier that is *known* — so
 * a component added tomorrow cannot silently receive no styling at all.
 *
 * It classifies with `classifySurface`, the same function the registry stamps
 * onto every catalogue entry and the gallery reads to decide what to wrap. One
 * classifier, so this test cannot pass while the gallery does something else.
 */

interface Entry {
  readonly domain: string;
  readonly name: string;
  readonly tier: SurfaceTier | null;
  readonly summary: string;
}

/**
 * Every component folder, discovered the same way the gallery discovers them —
 * from the folder tree, so the two cannot disagree about what exists.
 */
function readCatalogue(): Entry[] {
  const readmes = import.meta.glob('./domains/*/*/README.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, unknown>;
  // Sources come through the same glob mechanism, so this test needs no node
  // builtins — and the package keeps its browser-only type environment.
  const sources = import.meta.glob('./domains/*/*/*.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, unknown>;

  const entries: Entry[] = [];

  for (const path of Object.keys(readmes)) {
    const parts = path.split('/');
    const domain = parts[2];
    const name = parts[3];
    const raw = sources[`./domains/${domain}/${name}/${name}.tsx`];
    if (typeof raw !== 'string') continue;

    const readme = readmes[path];
    entries.push({
      domain,
      name,
      tier: classifySurface(name, raw),
      // Derived here rather than read from the generated catalogue: this test
      // checks the *rules*, and the build script applies the same ones.
      summary: typeof readme === 'string' ? summaryOf(readme, raw, name) : name,
    });
  }

  return entries;
}

const CATALOGUE_ENTRIES = readCatalogue();

describe('domain theming coverage', () => {
  it('finds every component in the library', () => {
    expect(CATALOGUE_ENTRIES.length).toBeGreaterThanOrEqual(99);
  });

  it('classifies every component into a known tier', () => {
    // The point of the test: a new component cannot land outside the matrix.
    const unclassified = CATALOGUE_ENTRIES.filter((entry) => entry.tier === null);
    expect(unclassified.map((entry) => `${entry.domain}/${entry.name}`)).toEqual([]);
  });

  it('every domain in the catalogue has visual tokens', () => {
    // A domain folder with no hue would render neutral grey and look broken.
    const domains = [...new Set(CATALOGUE_ENTRIES.map((entry) => entry.domain))];
    const missing = domains.filter((domain) => !(domain in DOMAIN_VISUALS));
    expect(missing).toEqual([]);
  });

  it('every domain with tokens still has components', () => {
    // Catches the reverse drift: a hue kept for a domain that was deleted.
    const domains = new Set(CATALOGUE_ENTRIES.map((entry) => entry.domain));
    const orphaned = Object.keys(DOMAIN_VISUALS).filter((domain) => !domains.has(domain));
    expect(orphaned).toEqual([]);
  });

  it('records the tier distribution so a change to it is visible in review', () => {
    const counts: Record<string, number> = {};
    for (const entry of CATALOGUE_ENTRIES) {
      counts[entry.tier ?? 'unclassified'] = (counts[entry.tier ?? 'unclassified'] ?? 0) + 1;
    }

    // Not a snapshot of exact numbers — that would fail on every added
    // component. What is pinned is the shape of the strategy: most components
    // are reachable with no edit, and portals stay a small, deliberate
    // exclusion.
    const styledWhereTheyStand =
      (counts['surface-root'] ?? 0) + (counts['surface-nested'] ?? 0) + (counts['list-row'] ?? 0);
    const wrapped = counts['no-surface'] ?? 0;
    const portals = counts.portal ?? 0;

    expect(styledWhereTheyStand + wrapped + portals).toBe(CATALOGUE_ENTRIES.length);
    // Portals are excluded by design; if that grows past a tenth of the library
    // the exclusion stops being defensible and needs revisiting.
    expect(portals / CATALOGUE_ENTRIES.length).toBeLessThan(0.1);
    // The wrapper path is the gallery's job, and it only pays off while it
    // covers a real share of the library rather than a handful of stragglers.
    expect(wrapped).toBeGreaterThan(0);
  });

  it('agrees with `needsDomainSurface` about which components the host must wrap', () => {
    // The gallery wraps exactly this set. If the two ever disagree, the
    // components in the gap render with no domain treatment and nothing fails.
    const byPredicate = CATALOGUE_ENTRIES.filter((entry) => needsDomainSurface(entry.tier))
      .map((entry) => `${entry.domain}/${entry.name}`)
      .sort();
    const byTier = CATALOGUE_ENTRIES.filter((entry) => entry.tier === 'no-surface')
      .map((entry) => `${entry.domain}/${entry.name}`)
      .sort();

    expect(byPredicate).toEqual(byTier);
    expect(byPredicate.length).toBeGreaterThan(0);
  });

  it('never asks a host to wrap a component that already renders a surface', () => {
    // The double-tint guard: a box tinted around an already-tinted card.
    const wrongly = CATALOGUE_ENTRIES.filter(
      (entry) =>
        needsDomainSurface(entry.tier) &&
        (entry.tier === 'surface-root' || entry.tier === 'surface-nested'),
    );
    expect(wrongly).toEqual([]);
  });
});

/**
 * The gallery's one-line descriptions, checked across the whole catalogue.
 *
 * Worth a test because the failure mode is quiet: the previous extractor took
 * the first line after the title, most READMEs open with a code fence, and the
 * gallery described 57 of 99 components as "ts". Everything still rendered, and
 * nothing failed.
 */
describe('component summaries', () => {
  it('never shows a code-fence language tag', () => {
    const fenceTags = new Set(['ts', 'tsx', 'js', 'jsx', 'json', 'bash', 'sh', 'css', 'html']);
    const broken = CATALOGUE_ENTRIES.filter((entry) => fenceTags.has(entry.summary.trim()));
    expect(broken.map((entry) => `${entry.domain}/${entry.name}`)).toEqual([]);
  });

  it('says something more than the component name', () => {
    // The name is the last-resort fallback. A handful is fine; most of the
    // library falling back means the extractor has stopped working.
    const bare = CATALOGUE_ENTRIES.filter((entry) => entry.summary === entry.name);
    expect(bare.length / CATALOGUE_ENTRIES.length).toBeLessThan(0.1);
  });

  it('gives every component a non-empty summary', () => {
    const empty = CATALOGUE_ENTRIES.filter((entry) => entry.summary.trim() === '');
    expect(empty.map((entry) => `${entry.domain}/${entry.name}`)).toEqual([]);
  });
});
