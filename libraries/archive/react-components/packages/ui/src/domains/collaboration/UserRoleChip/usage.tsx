import sample from './sample.json';
import { UserRoleChip, type TeamRole } from './UserRoleChip';

export function UserRoleChipUsage() {
  return (
    <UserRoleChip
      role={sample.role as TeamRole}
      // From the server: a menu built from the full role list and then rejected
      // on submit teaches users to try things that never work.
      assignableRoles={sample.assignableRoles as TeamRole[]}
      onChangeRole={async (role) => {
        const response = await fetch('/api/team/members/u_4/role', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        if (!response.ok) throw await response.json();
        // Permissions changed: revalidate whatever renders from them.
      }}
    />
  );
}
