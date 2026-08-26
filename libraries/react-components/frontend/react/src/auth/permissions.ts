/**
 * Role → permission mapping.
 *
 * Kept as data in one table rather than as `role === 'admin'` checks scattered
 * through components. Call sites ask for the *capability* they need, not for a
 * role, so adding a third role means editing this file and nothing else.
 *
 * Pure and React-free so it can be unit-tested without rendering.
 */
import type { UserRole } from '@/types/auth';

/**
 * Capabilities the UI gates on. Named after what the user is allowed to *do*,
 * not after the screen it happens on — screens get renamed, capabilities do not.
 */
export type Permission =
  /** Reach the authenticated shell at all. */
  | 'admin:access'
  /** Change persisted records (create, inline edit, delete). */
  | 'data:write'
  /** Read the error/monitoring console. */
  | 'diagnostics:read'
  /** Destructive maintenance: clear log channels, run the suite. */
  | 'diagnostics:manage';

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: ['admin:access', 'data:write', 'diagnostics:read', 'diagnostics:manage'],
  // A `user` can reach the console and read diagnostics, but cannot change
  // records or wipe logs. This is the least-privilege default: a new role
  // starts with the smallest set that still makes the app useful.
  user: ['admin:access', 'diagnostics:read'],
};

export function permissionsFor(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Whether a role grants a permission.
 *
 * `null` (signed out) never has a permission — the caller does not have to
 * special-case the anonymous branch at every site.
 */
export function roleHas(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return permissionsFor(role).includes(permission);
}

/** True when the role grants every listed permission. */
export function roleHasAll(
  role: UserRole | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => roleHas(role, permission));
}
