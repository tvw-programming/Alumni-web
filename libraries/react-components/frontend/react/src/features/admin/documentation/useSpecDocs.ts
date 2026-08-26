import { useQuery } from '@tanstack/react-query';

import { parseMarkdown, type ParsedMarkdown } from './markdown';

import type { SpecManifest, SpecSet } from './specDocTypes';

/**
 * Data access for the specification viewer.
 *
 * Two queries rather than one bundle: the manifest is small and needed
 * immediately, while a document is only needed once its title is clicked.
 * Fetching all 31 documents up front would move ~150 kB for the one the reader
 * actually wants.
 *
 * Both are effectively static for the life of the tab — the files change only
 * when the app is rebuilt — so `staleTime: Infinity` means revisiting a document
 * is instant and re-reads nothing.
 */

const MANIFEST_URL = '/specdoc/manifest.json';

export const specDocKeys = {
  all: ['specdoc'] as const,
  manifest: () => [...specDocKeys.all, 'manifest'] as const,
  document: (setId: string, path: string) => [...specDocKeys.all, 'document', setId, path] as const,
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Could not load ${url} (${String(response.status)})`);
  return (await response.json()) as T;
}

export function useSpecManifest() {
  return useQuery({
    queryKey: specDocKeys.manifest(),
    queryFn: () => fetchJson<SpecManifest>(MANIFEST_URL),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * One document, parsed.
 *
 * The parse happens in `queryFn`, not in the component, so it runs **once per
 * document** and the result is cached. Parsing during render would redo the work
 * on every unrelated state change — opening a folder, resizing, a theme toggle.
 */
export function useSpecDocument(setId: string, path: string | null) {
  return useQuery({
    queryKey: specDocKeys.document(setId, path ?? ''),
    queryFn: async (): Promise<ParsedMarkdown> => {
      const response = await fetch(`/specdoc/${setId}/${path ?? ''}`);
      if (!response.ok) {
        throw new Error(`Could not load ${path ?? ''} (${String(response.status)})`);
      }
      return parseMarkdown(await response.text());
    },
    // `path` is null until something is selected; a query with no target must
    // not run.
    enabled: path !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function findSet(manifest: SpecManifest | undefined, id: string): SpecSet | undefined {
  return manifest?.sets.find((set) => set.id === id);
}
