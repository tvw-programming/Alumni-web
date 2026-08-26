import List from '@mui/material/List';

import sample from './sample.json';
import { TeamMemberRow, type TeamMember } from './TeamMemberRow';

import type { TeamRole } from '../UserRoleChip/UserRoleChip';

export function TeamMemberRowUsage() {
  const member = sample.member as unknown as TeamMember;

  return (
    <List disablePadding>
      <TeamMemberRow
        member={member}
        assignableRoles={sample.assignableRoles as TeamRole[]}
        onChangeRole={async (role) => {
          const response = await fetch(`/api/team/members/${member.id}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
          });
          if (!response.ok) throw await response.json();
        }}
        onRemove={() => {
          /* confirm first — removal is destructive */
        }}
      />
    </List>
  );
}
