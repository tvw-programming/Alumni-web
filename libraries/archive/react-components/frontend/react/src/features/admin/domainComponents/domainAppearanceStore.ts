import { type DomainAppearance } from '@idol-ui/react';
import { useCallback, useSyncExternalStore } from 'react';

import { safeLocalStorage } from '@/utils/safeStorage';

/**
 * The chosen appearance for each domain, remembered between visits.
 *
 * Per *domain*, not per component: the point of domain theming is that
 * everything in a domain looks like it belongs together, so picking a variant
 * while looking at one cart component should hold for the whole of E-commerce
 * and not follow you into FinTech.
 *
 * Local to this machine on purpose. It is a viewing preference for the gallery,
 * not application data — putting it on the server would mean one developer's
 * choice of "3D glass" changing what everyone else sees.
 */

const KEY = 'idol.domain-appearance.v1';

/**
 * What a domain looks like before anyone chooses.
 *
 * `mesh` rather than `inherit`, so the gallery shows each domain's artwork by
 * default — that is the whole reason the motifs exist, and a gallery that hides
 * them until you find a toggle is not showing you the library.
 *
 * The *library's* default is still `inherit`: an app embedding these components
 * should look like itself until it asks for something else. This default
 * belongs to the gallery alone.
 */
export const DEFAULT_GALLERY_APPEARANCE: DomainAppearance = 'mesh';

const VALID: readonly DomainAppearance[] = [
  'inherit',
  'plain',
  'gradientGlass',
  'glass3d',
  'mesh',
  'animated',
];

type Stored = Record<string, DomainAppearance>;

/**
 * The parsed store.
 *
 * Cached rather than re-parsed per read because `useSyncExternalStore` compares
 * snapshots by identity: returning a fresh object each time is an infinite
 * render loop, not a subtle inefficiency.
 */
let snapshot: Stored = load();
const listeners = new Set<() => void>();

function load(): Stored {
  const raw = safeLocalStorage.get(KEY);
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    // Values are validated, not trusted: this is user-writable storage, and an
    // unknown string would reach the library as an appearance it cannot resolve.
    const clean: Stored = {};
    for (const [domainId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'string' && (VALID as readonly string[]).includes(value)) {
        clean[domainId] = value as DomainAppearance;
      }
    }
    return clean;
  } catch {
    // Corrupt JSON is not worth a crash on a preference nobody will miss.
    return {};
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Stored {
  return snapshot;
}

/** Sets one domain's appearance, or clears it back to the default. */
export function setDomainAppearance(domainId: string, appearance: DomainAppearance | null): void {
  const next = { ...snapshot };
  if (appearance === null) delete next[domainId];
  else next[domainId] = appearance;

  snapshot = next;
  safeLocalStorage.set(KEY, JSON.stringify(next));
  emit();
}

/** Every stored choice. Exposed so a "reset all" can know what it is clearing. */
export function useDomainAppearances(): Stored {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * One domain's appearance, and a setter for it.
 *
 * `isExplicit` is separate from the value because "chose mesh" and "never
 * chose anything, and the default happens to be mesh" are different states —
 * only the first should survive a change to the default.
 */
export function useDomainAppearance(domainId: string | undefined): {
  appearance: DomainAppearance;
  isExplicit: boolean;
  setAppearance: (next: DomainAppearance) => void;
  reset: () => void;
} {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const chosen = domainId === undefined ? undefined : stored[domainId];

  const setAppearance = useCallback(
    (next: DomainAppearance) => {
      if (domainId !== undefined) setDomainAppearance(domainId, next);
    },
    [domainId],
  );

  const reset = useCallback(() => {
    if (domainId !== undefined) setDomainAppearance(domainId, null);
  }, [domainId]);

  return {
    appearance: chosen ?? DEFAULT_GALLERY_APPEARANCE,
    isExplicit: chosen !== undefined,
    setAppearance,
    reset,
  };
}
