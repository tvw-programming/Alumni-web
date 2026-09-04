## Component Specification

### Name & Purpose
The Documentation section — `DocumentationLayout`, `SpecDocBrowser`, `SpecTree`,
`MarkdownView`, `SpecDocService` and the Markdown parser. It renders the
`specDoc` folders inside the running app: a folder tree on the left, the
selected document on the right.

### Location
- `src/app/layout/documentation-layout/documentation-layout.{ts,html,scss}`
- `src/app/features/documentation/spec-doc-browser.ts`
- `src/app/features/documentation/spec-doc-page.ts`
- `src/app/features/documentation/api-spec-doc-page.ts`
- `src/app/features/documentation/spec-tree.ts`
- `src/app/features/documentation/markdown-view.ts`
- `src/app/features/documentation/markdown.ts`
- `src/app/features/documentation/spec-doc.service.ts`
- `src/app/features/documentation/spec-doc.types.ts`
- `scripts/sync-specdocs.mjs`
- Routes: `/admin/documentation/spec-doc`, `/admin/documentation/api-spec-doc`

### Public Interface

```ts
// The one component a page composes. Both pages are three lines of template.
@Component({ selector: 'app-spec-doc-browser', providers: [SpecDocService] })
export class SpecDocBrowser {
  readonly setId = input.required<string>();       // 'ui' | 'api'
  readonly title = input.required<string>();
  readonly description = input.required<string>();
}

@Injectable()                                       // component-provided, not root
export class SpecDocService {
  readonly setId: WritableSignal<string>;
  readonly requestedPath: WritableSignal<string | null>;
  readonly manifest: HttpResourceRef<SpecManifest | undefined>;
  readonly set: Signal<SpecSet | undefined>;
  readonly tree: Signal<readonly SpecNode[]>;
  readonly files: Signal<SpecFileNode[]>;
  readonly selectedPath: Signal<string | null>;
  readonly selectedFile: Signal<SpecFileNode | undefined>;
  readonly document: Signal<ParsedMarkdown | null>;
  readonly isLoadingDocument: Signal<boolean>;
  select(path: string): void;
}

// Markdown → AST. No HTML string is produced at any point.
export function parseMarkdown(source: string): ParsedMarkdown;
export function parseInline(source: string): InlineNode[];
export function slugify(text: string): string;
export function stripInline(source: string): string;
```

### Dependencies
- Internal: `SpeechService` and `navCommandsFor` (sidebar voice commands),
  `DOCUMENTATION_NAV` / `documentationPath` from `layout/navigation.ts`.
- Angular: `httpResource` and `httpResource.text`, `@angular/router`
  (`queryParamMap`), Material `sidenav`/`list`/`icon`/`form-field`/`input`/
  `progress-spinner`, CDK `BreakpointObserver`.
- External: **none**. No Markdown library and no HTML sanitizer.

### Data Models

```ts
interface SpecFileNode { type: 'file'; name: string; path: string; title: string; bytes: number }
interface SpecFolderNode { type: 'folder'; name: string; path: string; children: SpecNode[] }
interface SpecSet { id: string; label: string; tree: SpecNode[]; fileCount: number }
interface SpecManifest { generatedAt: string; sets: SpecSet[] }

type BlockNode =
  | { kind: 'heading'; level: 1|2|3|4|5|6; id: string; children: InlineNode[] }
  | { kind: 'paragraph'; children: InlineNode[] }
  | { kind: 'code'; language: string; value: string }
  | { kind: 'list'; ordered: boolean; items: InlineNode[][] }
  | { kind: 'table'; head: InlineNode[][]; rows: InlineNode[][][] }
  | { kind: 'quote'; children: InlineNode[] }
  | { kind: 'rule' };
```

Two sets are published: `ui` from `frontend/angular/specDoc` (11 documents) and
`api` from `api/specDoc` (16 documents).

### Business Rules & Constraints

**The parser emits an AST, never an HTML string.** Every node becomes a real
element and every string goes through an interpolation, so there is no
`[innerHTML]` anywhere in `markdown-view.ts` and no sanitizer to configure
wrongly. A sanitizer can only be got wrong if an HTML string exists first.

**Only `http(s)` and in-page anchors are linkable.** Anything else — including a
relative path to a source file, which would 404 — renders as underlined text.
This is what keeps a `javascript:` href in a specification inert.

**The selected document lives in the URL** (`?doc=auth/auth-service.md`), written
with `replaceUrl` so browsing does not fill the back stack. That is what makes a
specification linkable and survives a reload.

**A stale or missing `?doc=` falls back to the first document**, rather than
leaving an empty pane.

**Parsing happens in a `computed`, not in the template.** In the template it
would redo the work on every unrelated change — opening a folder, typing in the
filter, toggling the theme.

**Collapsed folders are removed from the DOM, not hidden.** Items that stay in a
hidden subtree remain focusable, which is a keyboard trap.

**While the filter has text, every surviving branch renders open** — a match
inside a collapsed folder looks like no match at all.

**No ordinal gutter.** Only one list may answer to "second menu"; Master Data
owns that (`core/speech/ordinals.ts`). This sidebar registers named commands
only, via `navCommandsFor(..., 'Documentation', documentationPath, …)`.

**`httpResource.text` is required for the document body** — the default JSON
parse fails on the first Markdown file.

**The sync script keeps a set it cannot regenerate.** Docker's build context is
`frontend/angular` alone, so `api/specDoc` is out of reach at image-build time;
the published copy under `public/specdoc/api` is committed and reused. Wiping it
would silently ship an empty API Spec Doc section:

```js
if (await exists(set.source)) {
  await rm(target, { recursive: true, force: true });
  await cp(set.source, target, { recursive: true });
} else if (await exists(target)) {
  console.warn(`[specdoc] ${set.id}: source unavailable, keeping the published copy`);
}
```

**Editing trap:** a backtick anywhere inside an inline `template:` or `styles:`
string — comments included — terminates the template literal. This bit again
while writing `markdown-view.ts`.

**Whitespace trap:** an interpolation written bare inside a control-flow block
joins the surrounding indentation into one text node, which collapses to a real
space. `{{ value }}` is wrapped in a `<span>` with nothing beside it so inline
code followed by punctuation renders as `Error;` and not `Error ;`.

### Extension Points
- **A third set** — add an entry to `SETS` in `scripts/sync-specdocs.mjs` and a
  `NavItem` to `DOCUMENTATION_NAV`; the browser takes the set id as an input and
  needs no change.
- **More Markdown syntax** — add a `BlockNode` or `InlineNode` variant in
  `markdown.ts` and a `@case` in `markdown-view.ts`. The exhaustive switch is
  what makes an unhandled kind visible.
- **A table of contents** — `ParsedMarkdown.headings` already carries every
  heading with its slug id, and the rendered headings carry matching `id`
  attributes. Not currently rendered.
