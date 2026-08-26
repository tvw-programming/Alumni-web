## Component Specification

### Name & Purpose
`AppBreadcrumbs` and `buildBreadcrumbs` — the trail showing where the current
page sits, rendered in both shells.

### Location
- `src/app/shared/breadcrumbs/app-breadcrumbs.ts`
- `src/app/layout/breadcrumbs.ts` (pure trail builder)
- `src/app/layout/breadcrumbs.spec.ts` (10 tests)
- Rendered by `layout/admin-shell/admin-shell.html` and
  `layout/public-layout/public-layout.html`

### Public Interface

```ts
export interface Crumb {
  readonly label: string;
  /** Absent on the last crumb: it is the current page, so it is not a link. */
  readonly path?: string;
}

/** Pure: takes only what is in the URL. */
export function buildBreadcrumbs(pathname: string, search?: string): Crumb[];

@Component({ selector: 'app-breadcrumbs' })
export class AppBreadcrumbs {}   // no inputs — it reads the router
```

### Dependencies
- Internal: `ADMIN_NAV`, `MASTER_DATA_NAV`, `DOCUMENTATION_NAV`, `PUBLIC_NAV`,
  `masterDataPath`, `documentationPath` from `layout/navigation.ts`.
- Angular: `Router` (events converted with `toSignal` at the boundary),
  `RouterLink`, `MatIcon`.

### Data Models
`Crumb[]`, ordered root-first. Examples:

```
/about                                        → Home > About
/admin/dashboard                              → Admin > Dashboard
/admin/master-data/products-inline            → Admin > Master Data > Manage Product (inline edit)
/admin/documentation/api-spec-doc
  ?doc=products/product-repository.md          → Admin > Documentation > API Spec Doc > products > product-repository
```

### Business Rules & Constraints

**Labels come from the nav arrays, never from the URL**, so a renamed page is
renamed in the trail by the same edit. A path with no nav entry falls back to a
title-cased segment rather than rendering nothing.

**The last crumb is never a link.** A link to the current page is a dead control
that still takes a tab stop; it carries `aria-current="page"` instead.

**A one-crumb trail renders nothing** — no `<nav>` element at all. On the home
page a trail would only say "Home" while you are on Home.

**A section crumb is only a link when it goes somewhere else.** On
`/admin/master-data` the "Master Data" crumb is text, because that URL redirects
to its first child and the link would not land where the label says.

**The open specification document is part of the trail**, because it is part of
the address (`?doc=`). This is also the limit of what the builder can know: it
stays pure, so it uses the filename, not the manifest title, which is fetched.

**The longest matching section wins**, so a nested admin path cannot resolve to a
shorter prefix that also matches.

### Extension Points
- **A new section** — add it to `ADMIN_NAV` and, if it has children, a branch in
  `adminTrail` alongside the master-data and documentation ones.
- **Icons per crumb** — `Crumb` currently carries only `label` and `path`; the
  home icon is special-cased on `path === '/'`.
