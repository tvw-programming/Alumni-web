import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { useAction } from '../../../foundation';

export type TeamRole = 'owner' | 'admin' | 'member' | 'guest' | 'invited';

export interface UserRoleChipProps {
  role: TeamRole;
  /** Roles this viewer may assign. Empty means the chip is read-only. */
  assignableRoles?: TeamRole[];
  onChangeRole?: (role: TeamRole) => Promise<void>;
}

const ROLE_LABEL: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
  invited: 'Invited',
};

const ROLE_COLOR: Record<TeamRole, 'default' | 'primary' | 'info' | 'warning'> = {
  owner: 'primary',
  admin: 'info',
  member: 'default',
  guest: 'default',
  invited: 'warning',
};

/**
 * A role, and — when the viewer may change it — the control that changes it.
 *
 * Role changes are **server-authoritative**: the chip shows a spinner and only
 * takes the new role once the mutation succeeds. Predicting it would show a
 * permission the user does not have, and the rest of the UI would then render
 * from a lie.
 *
 * `assignableRoles` comes from the server too. A menu built from the full role
 * list and then rejected on submit teaches users to try things that never work.
 */
export function UserRoleChip({ role, assignableRoles = [], onChangeRole }: UserRoleChipProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const [result, change, pending] = useAction<TeamRole, TeamRole>(async (_previous, next) => {
    await onChangeRole?.(next);
    return next;
  });

  const current = result.status === 'success' ? result.data : role;
  const editable = assignableRoles.length > 0 && onChangeRole !== undefined;

  return (
    <>
      <Chip
        size="small"
        variant="outlined"
        color={ROLE_COLOR[current]}
        label={pending ? 'Updating…' : ROLE_LABEL[current]}
        icon={pending ? <CircularProgress size={12} sx={{ ml: 1 }} /> : undefined}
        deleteIcon={editable ? <ExpandMoreIcon /> : undefined}
        // `onDelete` only has to exist for MUI to render the trailing icon; the
        // typed `onClick` below opens the menu for both. MUI types the delete
        // handler's event as `any`, and reading `currentTarget` off that is
        // unchecked.
        onDelete={editable ? () => undefined : undefined}
        onClick={
          editable
            ? (event) => {
                setAnchor(event.currentTarget);
              }
            : undefined
        }
        aria-haspopup={editable ? 'menu' : undefined}
        aria-label={
          editable ? `Role: ${ROLE_LABEL[current]}. Change role` : `Role: ${ROLE_LABEL[current]}`
        }
        disabled={pending}
      />

      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => {
          setAnchor(null);
        }}
      >
        {assignableRoles.map((option) => (
          <MenuItem
            key={option}
            selected={option === current}
            onClick={() => {
              setAnchor(null);
              change(option);
            }}
          >
            {ROLE_LABEL[option]}
          </MenuItem>
        ))}
      </Menu>

      {result.status === 'error' ? (
        <Typography variant="caption" color="error.main" role="alert" sx={{ ml: 1 }}>
          {result.message}
        </Typography>
      ) : null}
    </>
  );
}
