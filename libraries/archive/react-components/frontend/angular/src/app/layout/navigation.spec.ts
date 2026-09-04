import { describe, expect, it } from 'vitest';

import { ADMIN_NAV, MASTER_DATA_NAV, PUBLIC_NAV, masterDataPath } from './navigation';

/**
 * Navigation is the single source of truth for the sidebar, the router and the
 * voice commands. These assertions pin the properties the other three depend on.
 */
describe('navigation metadata', () => {
  it('declares all 13 master-data sections', () => {
    expect(MASTER_DATA_NAV).toHaveLength(13);
  });

  it('gives every entry a label, a path and an icon', () => {
    for (const item of MASTER_DATA_NAV) {
      expect(item.label).toBeTruthy();
      expect(item.path).toBeTruthy();
      expect(item.icon).toBeTruthy();
    }
  });

  it('keeps paths unique within each list', () => {
    for (const list of [PUBLIC_NAV, ADMIN_NAV, MASTER_DATA_NAV]) {
      const paths = list.map((item) => item.path);
      expect(new Set(paths).size).toBe(paths.length);
    }
  });

  it('builds absolute master-data paths', () => {
    expect(masterDataPath(MASTER_DATA_NAV[0])).toBe('/admin/master-data/products');
    expect(masterDataPath(MASTER_DATA_NAV[12])).toBe('/admin/master-data/error-log');
  });

  it('uses relative paths for sidebar entries and absolute for shells', () => {
    // Sidebar entries nest under master-data, so they must NOT be absolute.
    for (const item of MASTER_DATA_NAV) expect(item.path.startsWith('/')).toBe(false);
    for (const item of ADMIN_NAV) expect(item.path.startsWith('/admin')).toBe(true);
  });
});
