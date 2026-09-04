import { type DomainMeta, type SurfaceTier } from '@idol-ui/react';
import { useQuery } from '@tanstack/react-query';

/**
 * The component catalogue, fetched rather than bundled.
 *
 * `scripts/build-domain-catalogue.mjs` writes `public/domain-catalogue.json`
 * at `predev` and `prebuild`. Fetching it keeps every byte of component source,
 * README prose and sample data out of the JavaScript bundle — the index is 4 KB
 * gzipped against the 189 KB the bundled registry used to add to every Master
 * Data page.
 *
 * The heavy text lives beside it under `public/domain-components/` and is
 * fetched only when a tab that displays it is opened.
 */

export interface CatalogueEntry {
  readonly id: string;
  readonly name: string;
  readonly domainId: string;
  readonly summary: string;
  /** How domain theming reaches this component. `null` if it could not be read. */
  readonly surfaceTier: SurfaceTier | null;
}

export interface DomainCatalogue {
  readonly domains: readonly DomainMeta[];
  readonly components: readonly CatalogueEntry[];
}

const EMPTY: DomainCatalogue = { domains: [], components: [] };

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} responded ${String(response.status)}`);
  }
  return (await response.json()) as T;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} responded ${String(response.status)}`);
  }
  return await response.text();
}

/**
 * The index. Generated at build time, so it never changes while the app runs —
 * hence `staleTime: Infinity`, which also means the sidebar tree and the detail
 * page share one fetch instead of racing each other for the same file.
 */
export function useDomainCatalogue() {
  return useQuery({
    queryKey: ['domain-catalogue'],
    queryFn: () => fetchJson<DomainCatalogue>('/domain-catalogue.json'),
    staleTime: Infinity,
  });
}

export type PayloadKind = 'README.md' | 'source.txt' | 'usage.txt' | 'sample.json';

/**
 * One component's text, fetched when the tab showing it is opened.
 *
 * `enabled` rather than a conditional hook: the query is declared on every
 * render and simply does not run until there is something to fetch.
 */
export function useComponentPayload(id: string | null, kind: PayloadKind) {
  return useQuery({
    queryKey: ['domain-component-payload', id, kind],
    queryFn: () => fetchText(`/domain-components/${String(id)}/${kind}`),
    enabled: id !== null,
    staleTime: Infinity,
  });
}

/** Domains that have components, in catalogue order. */
export function domainsOf(catalogue: DomainCatalogue | undefined): readonly DomainMeta[] {
  return (catalogue ?? EMPTY).domains;
}

export function componentsOf(catalogue: DomainCatalogue | undefined): readonly CatalogueEntry[] {
  return (catalogue ?? EMPTY).components;
}
