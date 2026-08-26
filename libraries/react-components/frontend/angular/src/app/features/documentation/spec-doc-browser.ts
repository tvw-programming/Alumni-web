import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { MarkdownView } from './markdown-view';
import { SpecDocService } from './spec-doc.service';
import { SpecTree } from './spec-tree';
import { ancestorsOf } from './spec-doc.types';

import type { SpecNode } from './spec-doc.types';

/** Case-insensitive filter that keeps a folder when any descendant matches. */
function filterTree(nodes: readonly SpecNode[], needle: string): SpecNode[] {
  if (!needle) return [...nodes];
  return nodes.flatMap<SpecNode>((node) => {
    if (node.type === 'file') {
      const haystack = `${node.title} ${node.name} ${node.path}`.toLowerCase();
      return haystack.includes(needle) ? [node] : [];
    }
    const children = filterTree(node.children, needle);
    return children.length > 0 ? [{ ...node, children }] : [];
  });
}

function collectFolderPaths(nodes: readonly SpecNode[]): string[] {
  return nodes.flatMap((node) =>
    node.type === 'folder' ? [node.path, ...collectFolderPaths(node.children)] : [],
  );
}

/**
 * The specification browser: folder tree on the left, document on the right.
 *
 * The same split as Manage Product (inline edit) — a narrow navigator beside a
 * wide working area — but weighted further towards the content, because reading
 * a specification is the whole task here.
 *
 * The selected document lives in the URL ("?doc=auth/auth-service.md"), so a
 * specification can be linked to, bookmarked and shared. That is the reason it
 * is a query parameter rather than component state.
 */
@Component({
  selector: 'app-spec-doc-browser',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MarkdownView,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    SpecTree,
  ],
  providers: [SpecDocService],
  template: `
    <div class="spec">
      <header class="spec__intro">
        <h1>{{ title() }}</h1>
        <p>{{ description() }}</p>
      </header>

      @if (service.manifestError()) {
        <div class="spec__alert" role="alert">
          The specification manifest could not be loaded. Run <code>pnpm start</code> or
          <code>pnpm build</code> — both regenerate it from the <code>specDoc</code> folders.
        </div>
      }

      <div class="spec__body">
        <aside class="spec__nav">
          <div class="spec__filter">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="spec__search">
              <mat-label>Filter documents</mat-label>
              <input
                matInput
                type="search"
                [value]="search()"
                (input)="search.set($any($event.target).value)"
              />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <div class="spec__filter-row">
              @if (service.set(); as set) {
                <span class="spec__count">{{ set.fileCount }} documents</span>
              }
              <!--
                One button, not two. Its meaning follows what is on screen: with
                anything open it collapses, otherwise it expands — so the icon
                always shows the action, never the current state.
              -->
              <button
                matIconButton
                class="spec__fold"
                [disabled]="!!needle() || folderPaths().length === 0"
                [attr.aria-expanded]="allExpanded()"
                [attr.aria-label]="allExpanded() ? 'Collapse all folders' : 'Expand all folders'"
                [matTooltip]="allExpanded() ? 'Collapse all folders' : 'Expand all folders'"
                (click)="toggleAll()"
              >
                <mat-icon>{{ allExpanded() ? 'unfold_less' : 'unfold_more' }}</mat-icon>
              </button>
            </div>
          </div>

          <div class="spec__tree">
            @if (service.manifest.isLoading()) {
              <div class="spec__center"><mat-spinner diameter="24" /></div>
            } @else if (visibleTree().length === 0) {
              <p class="spec__empty">No document matches “{{ search() }}”.</p>
            } @else {
              <app-spec-tree
                [nodes]="visibleTree()"
                [selectedPath]="service.selectedPath()"
                [openFolders]="openFolders()"
                (toggleFolder)="toggleFolder($event)"
                (selectFile)="selectFile($event)"
              />
            }
          </div>
        </aside>

        <section class="spec__content">
          @if (service.selectedFile(); as file) {
            <div class="spec__meta">
              <span class="spec__path">{{ file.path }}</span>
              <span class="spec__size">{{ (file.bytes / 1024).toFixed(1) }} KB</span>
            </div>
          }

          @if (service.isLoadingDocument()) {
            <div class="spec__center spec__center--tall"><mat-spinner diameter="40" /></div>
          } @else if (service.documentError()) {
            <div class="spec__alert" role="alert">That document could not be loaded.</div>
          } @else if (service.document(); as doc) {
            <app-markdown-view [doc]="doc" />
          } @else if (!service.manifest.isLoading()) {
            <p class="spec__empty">No documents in this set yet.</p>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    /*
     * Both columns fill the height the documentation outlet gives them, which
     * is the viewport minus the admin app bar — near enough 98vh, and correct
     * whatever the heading above happens to measure. A hard-coded viewport
     * fraction was 22px out here, which is exactly the kind of thing that only
     * shows up at one window size.
     */
    :host {
      display: block;
      box-sizing: border-box;
      height: 100%;
      padding: 16px 0 24px;
    }
    .spec { display: flex; flex-direction: column; height: 100%; }
    .spec__intro { flex: 0 0 auto; }
    .spec__intro h1 { margin: 0; font: var(--mat-sys-headline-small); font-weight: 700; }
    .spec__intro p { margin: 4px 0 16px; color: var(--mat-sys-on-surface-variant); font: var(--mat-sys-body-medium); }

    .spec__body {
      flex: 1 1 auto;
      min-height: 0;
      display: grid;
      /* The navigator is fixed and the content takes the rest, so a long title
         cannot squeeze the reading column. */
      grid-template-columns: 320px minmax(0, 1fr);
      gap: 16px;
    }
    .spec__nav {
      /* Same height as the reading pane, so the columns line up and the tree
         scrolls inside itself rather than growing the page. */
      height: 100%;
      min-height: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low);
      overflow: hidden;
    }
    .spec__filter { padding: 12px 12px 8px; }
    .spec__search { width: 100%; }
    .spec__filter-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .spec__count {
      padding: 2px 10px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 999px;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);
    }
    .spec__fold { margin-left: auto; }
    .spec__tree {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      padding: 4px 4px 12px;
    }

    /* A fixed-height reading pane that scrolls its own content in both
       directions. "auto" rather than "scroll" so a bar appears only when
       something actually overflows — a wide code block or a wide table. */
    .spec__content {
      height: 100%;
      min-height: 0;
      box-sizing: border-box;
      overflow-x: auto;
      overflow-y: auto;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low);
      padding: 24px;
    }
    .spec__meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .spec__path {
      padding: 2px 10px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 999px;
      font: var(--mat-sys-body-small);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    .spec__size { font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); }

    .spec__alert {
      padding: 12px 16px;
      margin-bottom: 16px;
      border-radius: 8px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      font: var(--mat-sys-body-medium);
    }
    @media (max-width: 900px) {
      .spec__body { grid-template-columns: 1fr; }
      /* Stacked, two full-height panes would mean scrolling one to reach the
         other, so the tree is capped and the document grows with its content. */
      :host { height: auto; }
      .spec { height: auto; }
      .spec__nav { height: auto; max-height: 60vh; }
      .spec__content { height: auto; min-height: 400px; }
    }

    .spec__center { display: flex; justify-content: center; padding: 32px 0; }
    .spec__center--tall { padding: 64px 0; }
    .spec__empty { padding: 16px; color: var(--mat-sys-on-surface-variant); font: var(--mat-sys-body-medium); }
  `,
})
export class SpecDocBrowser {
  /** Manifest set to browse: `ui` or `api`. */
  readonly setId = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();

  protected readonly service = inject(SpecDocService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly search = signal('');

  /**
   * Folders the reader has explicitly opened or closed.
   *
   * Only *overrides* are stored. Which folders are open is derived from these
   * plus the selection, so opening the tree to a deep link needs no effect
   * writing state back — and a folder the reader deliberately closed stays
   * closed even though it is on the path to the open document.
   */
  private readonly folderOverrides = signal<ReadonlyMap<string, boolean>>(new Map());

  /** `?doc=` as a signal; the router's params are one of the RxJS boundaries. */
  private readonly docParam = toSignal(this.route.queryParamMap, { initialValue: null });

  constructor() {
    // Keep the service pointed at this page's set and at the URL's document.
    effect(() => {
      this.service.setId.set(this.setId());
    });
    effect(() => {
      this.service.requestedPath.set(this.docParam()?.get('doc') ?? null);
    });
  }

  protected readonly needle = computed(() => this.search().trim().toLowerCase());

  protected readonly visibleTree = computed(() =>
    filterTree(this.service.tree(), this.needle()),
  );

  protected readonly openFolders = computed<ReadonlySet<string>>(() => {
    // While filtering, every surviving branch shows open — a match hidden
    // inside a collapsed folder looks like no match at all.
    if (this.needle()) return new Set(collectFolderPaths(this.visibleTree()));

    const path = this.service.selectedPath();
    const open = new Set(path === null ? [] : ancestorsOf(path));
    for (const [folder, isOpen] of this.folderOverrides()) {
      if (isOpen) open.add(folder);
      else open.delete(folder);
    }
    return open;
  });

  protected readonly folderPaths = computed(() => collectFolderPaths(this.service.tree()));

  protected readonly allExpanded = computed(() => {
    const paths = this.folderPaths();
    const open = this.openFolders();
    return paths.length > 0 && paths.every((path) => open.has(path));
  });

  protected toggleAll(): void {
    // Every folder gets an explicit override, including the ancestors of the
    // selected document — otherwise "collapse all" would leave those open,
    // since they are open by derivation rather than by choice.
    const next = !this.allExpanded();
    this.folderOverrides.set(new Map(this.folderPaths().map((path) => [path, next])));
  }

  protected toggleFolder(path: string): void {
    // The override records the opposite of what is on screen, not of what is in
    // the map — a folder open only because it holds the selection has no entry
    // yet, and clicking it must close it.
    const isOpen = this.openFolders().has(path);
    this.folderOverrides.update((current) => new Map(current).set(path, !isOpen));
  }

  protected selectFile(path: string): void {
    // `replaceUrl` so browsing documents does not fill the back stack.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { doc: path },
      replaceUrl: true,
    });
  }
}
