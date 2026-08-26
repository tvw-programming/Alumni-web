import { describe, expect, it } from 'vitest';

import { permissionsFor, roleHas, roleHasAll } from './permissions';

describe('permissions', () => {
  it('grants an admin every capability', () => {
    expect(roleHas('admin', 'admin:access')).toBe(true);
    expect(roleHas('admin', 'data:write')).toBe(true);
    expect(roleHas('admin', 'diagnostics:read')).toBe(true);
    expect(roleHas('admin', 'diagnostics:manage')).toBe(true);
  });

  it('limits a user to reading', () => {
    expect(roleHas('user', 'admin:access')).toBe(true);
    expect(roleHas('user', 'diagnostics:read')).toBe(true);
    // The two that actually change or destroy something.
    expect(roleHas('user', 'data:write')).toBe(false);
    expect(roleHas('user', 'diagnostics:manage')).toBe(false);
  });

  it('denies everything when signed out', () => {
    for (const role of [null, undefined] as const) {
      expect(roleHas(role, 'admin:access')).toBe(false);
      expect(roleHas(role, 'diagnostics:read')).toBe(false);
    }
  });

  it('requires every permission in the all-of variant', () => {
    expect(roleHasAll('admin', ['diagnostics:read', 'diagnostics:manage'])).toBe(true);
    expect(roleHasAll('user', ['diagnostics:read', 'diagnostics:manage'])).toBe(false);
    // Vacuous truth: an empty requirement list is satisfied by any signed-in role.
    expect(roleHasAll('user', [])).toBe(true);
    expect(roleHasAll(null, [])).toBe(true);
  });

  it('never lets a role hold a capability outside its own table', () => {
    const userPerms = permissionsFor('user');
    expect(userPerms).not.toContain('data:write');
    expect(userPerms).not.toContain('diagnostics:manage');
    expect(permissionsFor('admin').length).toBeGreaterThan(userPerms.length);
  });
});
