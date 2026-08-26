import { useAuth } from '@/store/authContext';

import { roleHas, roleHasAll, type Permission } from './permissions';

/**
 * Whether the signed-in user holds a capability.
 *
 * Components ask `usePermission('data:write')` rather than reading
 * `user.role === 'admin'`, so a change to the role model never requires
 * touching a component.
 */
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return roleHas(user?.role, permission);
}

/** All-of variant, for actions that need more than one capability. */
export function usePermissions(permissions: readonly Permission[]): boolean {
  const { user } = useAuth();
  return roleHasAll(user?.role, permissions);
}
