## Component Specification

### Name & Purpose

The Documentation section — `DocumentationLayout`, `SpecDocBrowser`, `TreeNav`,
`MarkdownView`, the `useSpecDocs` hooks and the Markdown parser. It renders the
`specDoc` folders inside the running app: a folder tree on the left, the
selected document on the right.

### Location

- `src/features/admin/DocumentationLayout.tsx`
- `src/features/admin/documentation/SpecDocBrowser.tsx`
- `src/features/admin/documentation/SpecDocPage.tsx`
- `src/features/admin/documentation/ApiSpecDocPage.tsx`
- `src/components/TreeNav/TreeNav.tsx` (shared; the specification browser and the
  component gallery both render it)
- `src/features/admin/documentation/MarkdownView.tsx`
- `src/features/admin/documentation/markdown.ts`
- `src/features/admin/documentation/useSpecDocs.ts`
- `src/features/admin/documentation/specDocTypes.ts`
- `scripts/sync-specdocs.mjs`
- Routes: `/admin/documentation/spec-doc`, `/admin/documentation/api-spec-doc`

### Public Interface

```tsx
interface SpecDocBrowserProps {
  setId: string; // 'ui' | 'api'
  title: string;
  description: string;
}
export function SpecDocBrowser(props: SpecDocBrowserProps): JSX.Element;

// Data access. Documents are immutable per build, so both are staleTime: Infinity.
export function useSpecManifest(): UseQueryResult<SpecManifest>;
export function useSpecDocument(setId: string, path: string | null): UseQueryResult<ParsedMarkdown>;
export function findSet(manifest: SpecManifest | undefined, id: string): SpecSet | undefined;

// Markdown → AST. No HTML string is produced at any point.
export function parseMarkdown(source: string): ParsedMarkdown;
export function parseInline(source: string): InlineNode[];
export function slugify(text: string): string;
export function stripInline(source: string): string;
```

### Dependencies

- Internal: `DOCUMENTATION_NAV` / `documentationPath` from `routes/navigation`,
  `navCommandsFor` + `useSpeechCommands` for the sidebar's voice commands.
- External: `@tanstack/react-query`, `react-router-dom` (`useSearchParams`), MUI.
- **No Markdown library and no HTML sanitizer.**

### Data Models

```ts
interface SpecFileNode {
  type: 'file';
  name: string;
  path: string;
  title: string;
  bytes: number;
}
interface SpecFolderNode {
  type: 'folder';
  name: string;
  path: string;
  children: SpecNode[];
}
interface SpecSet {
  id: string;
  label: string;
  tree: SpecNode[];
  fileCount: number;
}
interface SpecManifest {
  generatedAt: string;
  sets: SpecSet[];
}

type BlockNode =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; id: string; children: InlineNode[] }
  | { kind: 'paragraph'; children: InlineNode[] }
  | { kind: 'code'; language: string; value: string }
  | { kind: 'list'; ordered: boolean; items: InlineNode[][] }
  | { kind: 'table'; head: InlineNode[][]; rows: InlineNode[][][] }
  | { kind: 'quote'; children: InlineNode[] }
  | { kind: 'rule' };
```

Two sets are published: `ui` from `frontend/react/specDoc` (15 documents) and
`api` from `api/specDoc` (16 documents).

### Business Rules & Constraints

**The parser emits an AST, never an HTML string.** `MarkdownView` renders nodes
as elements, so there is no `dangerouslySetInnerHTML` in the feature and no
sanitizer to configure wrongly — a sanitizer can only be got wrong if an HTML
string exists first.

**Only `http(s)` and in-page anchors are linkable.** Anything else renders as
text, which keeps a `javascript:` href in a specification inert and avoids dead
links to source paths the browser cannot fetch.

**The selected document lives in the URL** (`?doc=auth/authService.md`), set with
`{ replace: true }` so browsing does not fill the back stack.

**A stale or missing `?doc=` falls back to the first document** rather than
leaving an empty pane.

**Parsing happens in `queryFn`, not in render**, so a re-render for any other
reason does not re-parse the document. The parsed AST is what the cache holds.

**Collapsed folders unmount their subtree** (`unmountOnExit` on `Collapse`);
keeping hidden items mounted leaves them focusable.

**While the filter has text, every surviving branch renders open.**

**Deliberately no ordinal gutter.** Only one list may answer to "second menu"
(`speech/ordinals.ts`); Master Data owns that. This sidebar registers named
commands only.

**The sync script keeps a set it cannot regenerate.** Docker's build context is
`frontend/react` alone, so `api/specDoc` is out of reach at image-build time and
the committed copy under `public/specdoc/api` is reused rather than wiped.

### Extension Points

- **A third set** — add an entry to `SETS` in `scripts/sync-specdocs.mjs` and a
  nav item to `DOCUMENTATION_NAV`; `SpecDocBrowser` takes the set id as a prop.
- **More Markdown syntax** — add a node variant in `markdown.ts` and a branch in
  `MarkdownView.tsx`.
- **A table of contents** — `ParsedMarkdown.headings` already carries every
  heading with its slug, and rendered headings carry matching ids.
