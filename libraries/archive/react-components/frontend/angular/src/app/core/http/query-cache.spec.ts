import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { QueryCache } from './query-cache';

/**
 * `QueryCache` is the piece with no React counterpart — TanStack supplied it
 * there. Prefix matching is the part most likely to be subtly wrong, so it is
 * pinned hardest here.
 */
describe('QueryCache', () => {
  let cache: QueryCache;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    cache = TestBed.inject(QueryCache);
  });

  it('starts every key at version 0', () => {
    expect(cache.version(['products'])).toBe(0);
    expect(cache.version(['users', 'detail', 7])).toBe(0);
  });

  it('bumps a key when it is invalidated', () => {
    cache.version(['products']);
    cache.invalidate(['products']);
    expect(cache.version(['products'])).toBe(1);
  });

  it('invalidates descendants of a key', () => {
    // The behaviour that makes a key hierarchy worth having: creating a product
    // invalidates the parent, and every list and detail query refetches.
    cache.version(['products']);
    cache.version(['products', 'list', { page: 0 }]);
    cache.version(['products', 'detail', 1]);

    cache.invalidate(['products']);

    expect(cache.version(['products'])).toBe(1);
    expect(cache.version(['products', 'list', { page: 0 }])).toBe(1);
    expect(cache.version(['products', 'detail', 1])).toBe(1);
  });

  it('leaves unrelated keys alone', () => {
    cache.version(['products']);
    cache.version(['users']);

    cache.invalidate(['products']);

    expect(cache.version(['users'])).toBe(0);
  });

  it('does not let a partial segment match a longer one', () => {
    // Without a delimiter, 'product' would prefix-match 'products' and wipe the
    // wrong cache entries.
    cache.version(['product']);
    cache.version(['products']);

    cache.invalidate(['product']);

    expect(cache.version(['product'])).toBe(1);
    expect(cache.version(['products'])).toBe(0);
  });

  it('treats equivalent filter objects as the same key regardless of key order', () => {
    const a = cache.versionOf(['products', 'list', { page: 1, search: 'x' }]);
    cache.invalidate(['products', 'list', { search: 'x', page: 1 }]);
    expect(a()).toBe(1);
  });

  it('ignores undefined filter values when building a key', () => {
    const a = cache.versionOf(['products', 'list', { page: 1, search: undefined }]);
    cache.invalidate(['products', 'list', { page: 1 }]);
    expect(a()).toBe(1);
  });

  it('invalidates a key that has never been read, so later resources are not stale', () => {
    cache.invalidate(['orders']);
    // The key now exists at version 0; a resource created afterwards starts
    // fresh rather than inheriting a version from before the invalidation.
    expect(cache.version(['orders'])).toBe(0);
  });

  it('invalidates everything on demand', () => {
    cache.version(['products']);
    cache.version(['users']);

    cache.invalidateAll();

    expect(cache.version(['products'])).toBe(1);
    expect(cache.version(['users'])).toBe(1);
  });

  it('exposes a reactive signal that updates in place', () => {
    const version = cache.versionOf(['products']);
    expect(version()).toBe(0);
    cache.invalidate(['products']);
    expect(version()).toBe(1);
  });
});
