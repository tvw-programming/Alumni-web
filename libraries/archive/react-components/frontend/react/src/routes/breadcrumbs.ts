import {
  ADMIN_NAV,
  DOCUMENTATION_NAV,
  MASTER_DATA_NAV,
  PUBLIC_NAV,
  documentationPath,
  masterDataPath,
} from './navigation';

/**
 * One step in a breadcrumb trail.
 *
 * `to` absent means "this is where you are" — the last crumb, rendered as text
 * rather than a link. A link to the current page is a dead control that still
 * takes a tab stop.
 */
export interface Crumb {
  label: string;
  to?: string;
}

/**
 * The trail for a location.
 *
 * Built from the same nav arrays the sidebars and the router use, so a renamed
 * page is renamed here too — there is no second list of labels to forget.
 *
 * Pure and synchronous: it takes only what is in the URL, which is also why the
 * open document in Documentation contributes crumbs (it lives in `?doc=`) while
 * anything that would need the fetched manifest does not.
 */
export function buildBreadcrumbs(pathname: string, search = ''): Crumb[] {
  if (pathname.startsWith('/admin')) return adminTrail(pathname, search);
  return publicTrail(pathname);
}

function publicTrail(pathname: string): Crumb[] {
  const home: Crumb = { label: 'Home', to: '/' };
  if (pathname === '/') return [{ label: 'Home' }];

  const match = PUBLIC_NAV.find((item) => item.to === pathname);
  // An unlisted public page still gets a trail, from its own path — a 404 or a
  // one-off page should not silently render an empty bar.
  return [home, { label: match?.label ?? titleFromSegment(lastSegment(pathname)) }];
}

function adminTrail(pathname: string, search: string): Crumb[] {
  const trail: Crumb[] = [{ label: 'Admin', to: '/admin' }];

  // The longest match wins, so `/admin/master-data/products` resolves to Master
  // Data rather than to any shorter prefix that also matches.
  const section = [...ADMIN_NAV]
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];

  if (!section) {
    const segment = lastSegment(pathname);
    return segment === 'admin'
      ? [{ label: 'Admin' }]
      : [...trail, { label: titleFromSegment(segment) }];
  }

  const isSectionRoot = pathname === section.to;
  trail.push({ label: section.label, to: isSectionRoot ? undefined : section.to });
  if (isSectionRoot) return trail;

  if (section.to === '/admin/master-data') {
    const page = MASTER_DATA_NAV.find((item) => pathname === masterDataPath(item));
    trail.push({ label: page?.label ?? titleFromSegment(lastSegment(pathname)) });
    return trail;
  }

  if (section.to === '/admin/documentation') {
    const page = DOCUMENTATION_NAV.find((item) => pathname === documentationPath(item));
    const doc = new URLSearchParams(search).get('doc');
    // The open document is part of the address, so it is part of the trail —
    // and it is the only crumb here that is not a destination in the nav.
    trail.push({
      label: page?.label ?? titleFromSegment(lastSegment(pathname)),
      to: doc ? pathname : undefined,
    });
    if (doc) trail.push(...documentCrumbs(doc));
    return trail;
  }

  trail.push({ label: titleFromSegment(lastSegment(pathname)) });
  return trail;
}

/** `auth/auth-service.md` → `auth` (not a destination) then `auth-service`. */
function documentCrumbs(doc: string): Crumb[] {
  const parts = doc.split('/').filter(Boolean);
  return parts.map((part, index) => ({
    label: index === parts.length - 1 ? part.replace(/\.md$/i, '') : part,
  }));
}

function lastSegment(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

/** `api-call-examples` → `Api call examples`, for a path with no nav entry. */
function titleFromSegment(segment: string): string {
  if (!segment) return '';
  const spaced = segment.replace(/[-_]/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
