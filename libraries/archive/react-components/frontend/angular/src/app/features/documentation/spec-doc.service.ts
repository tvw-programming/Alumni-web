import { httpResource } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';

import { parseMarkdown, type ParsedMarkdown } from './markdown';

import type { SpecManifest, SpecNode, SpecSet } from './spec-doc.types';
import { flattenFiles } from './spec-doc.types';

/**
 * Data access for the specification viewer.
 *
 * Two resources rather than one bundle: the manifest is small and needed
 * immediately, a document only once its title is clicked. Fetching all 27
 * documents up front would move ~150 kB for the one the reader wants.
 *
 * Component-provided, not root — this is page state and should be torn down
 * with the page.
 */
@Injectable()
export class SpecDocService {
  /** Which set the page is showing: `ui` or `api`. */
  readonly setId = signal('ui');
  /** Path within the set, e.g. `auth/auth-service.md`. Null selects the first. */
  readonly requestedPath = signal<string | null>(null);

  readonly manifest = httpResource<SpecManifest>(() => ({ url: '/specdoc/manifest.json' }));

  readonly set = computed<SpecSet | undefined>(() =>
    this.manifest.value()?.sets.find((entry) => entry.id === this.setId()),
  );

  readonly tree = computed<readonly SpecNode[]>(() => this.set()?.tree ?? []);
  readonly files = computed(() => flattenFiles(this.tree()));

  /**
   * The document to show.
   *
   * Falls back to the first file rather than an empty pane, and ignores a stale
   * request that no longer exists — a bookmarked `?doc=` must not leave the
   * reader staring at nothing.
   */
  readonly selectedPath = computed<string | null>(() => {
    const files = this.files();
    if (files.length === 0) return null;
    const requested = this.requestedPath();
    if (requested && files.some((file) => file.path === requested)) return requested;
    return files[0].path;
  });

  readonly selectedFile = computed(() =>
    this.files().find((file) => file.path === this.selectedPath()),
  );

  /**
   * The document body, as text.
   *
   * `responseType: 'text'` because these are Markdown files — the default JSON
   * parse would fail on the first one.
   */
  private readonly source = httpResource.text(() => {
    const path = this.selectedPath();
    // Returning undefined keeps the resource idle; there is nothing to fetch
    // before the manifest arrives.
    if (path === null) return undefined;
    return { url: `/specdoc/${this.setId()}/${path}` };
  });

  /**
   * Parsed once per document, in a `computed`.
   *
   * Parsing inside the template would redo the work on every unrelated change —
   * opening a folder, typing in the filter, toggling the theme.
   */
  readonly document = computed<ParsedMarkdown | null>(() => {
    const text = this.source.value();
    return text ? parseMarkdown(text) : null;
  });

  readonly isLoadingDocument = computed(() => this.source.isLoading());
  readonly documentError = computed(() => this.source.error());
  readonly manifestError = computed(() => this.manifest.error());

  select(path: string): void {
    this.requestedPath.set(path);
  }
}
