import { describe, expect, it } from 'vitest';

import { buildBreadcrumbs } from './breadcrumbs';

describe('buildBreadcrumbs', () => {
  it('gives the home page a single crumb, so the bar renders nothing', () => {
    expect(buildBreadcrumbs('/')).toEqual([{ label: 'Home' }]);
  });

  it('links back to home from a public page', () => {
    expect(buildBreadcrumbs('/about')).toEqual([{ label: 'Home', path: '/' }, { label: 'About' }]);
  });

  it('uses the nav label, not the URL segment', () => {
    const trail = buildBreadcrumbs('/admin/master-data/products-inline');
    expect(trail.map((crumb) => crumb.label)).toEqual([
      'Admin',
      'Master Data',
      'Manage Product (inline edit)',
    ]);
  });

  it('never links the last crumb', () => {
    for (const path of ['/about', '/admin/dashboard', '/admin/master-data/users']) {
      const trail = buildBreadcrumbs(path);
      expect(trail[trail.length - 1].path).toBeUndefined();
    }
  });

  it('links every crumb except the last', () => {
    const trail = buildBreadcrumbs('/admin/master-data/error-log');
    expect(trail.slice(0, -1).every((crumb) => typeof crumb.path === 'string')).toBe(true);
  });

  it('drops the section link when the section is the page', () => {
    // `/admin/master-data` redirects to its first child, so linking to it from
    // the crumb that *names* it would be a link to somewhere else.
    expect(buildBreadcrumbs('/admin/master-data')).toEqual([
      { label: 'Admin', path: '/admin' },
      { label: 'Master Data' },
    ]);
  });

  it('adds the open document to the Documentation trail', () => {
    const trail = buildBreadcrumbs('/admin/documentation/spec-doc', '?doc=auth/auth-service.md');
    expect(trail.map((crumb) => crumb.label)).toEqual([
      'Admin',
      'Documentation',
      'Spec Doc',
      'auth',
      'auth-service',
    ]);
    // With a document open, "Spec Doc" becomes a way back to the section root.
    expect(trail[2].path).toBe('/admin/documentation/spec-doc');
  });

  it('leaves Spec Doc unlinked when no document is open', () => {
    const trail = buildBreadcrumbs('/admin/documentation/spec-doc');
    expect(trail[trail.length - 1]).toEqual({ label: 'Spec Doc' });
  });

  it('falls back to the path for a page with no nav entry', () => {
    expect(buildBreadcrumbs('/admin/master-data/not-a-real-page').at(-1)).toEqual({
      label: 'Not a real page',
    });
  });

  it('handles an unknown admin path without throwing', () => {
    expect(buildBreadcrumbs('/admin')).toEqual([{ label: 'Admin' }]);
  });
});
