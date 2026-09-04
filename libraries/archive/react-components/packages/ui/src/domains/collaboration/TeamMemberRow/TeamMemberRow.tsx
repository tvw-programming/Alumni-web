import MoreVertIcon from '@mui/icons-material/MoreVert';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo, useState } from 'react';

import { describe, timeLabel } from '../../../foundation';

import { UserRoleChip, type TeamRole } from '../UserRoleChip/UserRoleChip';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUri?: string;
  role: TeamRole;
  presence?: 'online' | 'away' | 'offline';
  lastActiveAt?: string;
  invitePendingSince?: string;
}

export interface TeamMemberRowProps {
  member: TeamMember;
  assignableRoles?: TeamRole[];
  onChangeRole?: (role: TeamRole) => Promise<void>;
  onRemove?: () => void;
  onResendInvitation?: () => void;
}

/**
 * One person in a team list.
 *
 * Presence is a **word** — "Online", "Away", "Offline" — beside the dot. A
 * coloured dot alone communicates nothing to a screen reader and little to a
 * colour-blind user, and presence is exactly the kind of thing that gets built
 * as a dot and left there.
 */
export const TeamMemberRow = memo(function TeamMemberRow({
  member,
  assignableRoles,
  onChangeRole,
  onRemove,
  onResendInvitation,
}: TeamMemberRowProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const presenceLabel =
    member.presence === 'online' ? 'Online' : member.presence === 'away' ? 'Away' : 'Offline';

  return (
    <ListItem
      divider
      sx={{ gap: 1.5 }}
      aria-label={describe(
        member.name,
        member.email,
        member.role,
        member.presence ? presenceLabel : undefined,
        member.invitePendingSince ? `invited ${timeLabel(member.invitePendingSince)}` : undefined,
      )}
      secondaryAction={
        onRemove || onResendInvitation ? (
          <>
            <IconButton
              edge="end"
              size="small"
              aria-label={`Options for ${member.name}`}
              onClick={(event) => {
                setAnchor(event.currentTarget);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={anchor}
              open={anchor !== null}
              onClose={() => {
                setAnchor(null);
              }}
            >
              {member.invitePendingSince && onResendInvitation ? (
                <MenuItem
                  onClick={() => {
                    setAnchor(null);
                    onResendInvitation();
                  }}
                >
                  Resend invitation
                </MenuItem>
              ) : null}
              {onRemove ? (
                <MenuItem
                  onClick={() => {
                    setAnchor(null);
                    onRemove();
                  }}
                >
                  Remove member
                </MenuItem>
              ) : null}
            </Menu>
          </>
        ) : null
      }
    >
      <Badge
        color={
          member.presence === 'online'
            ? 'success'
            : member.presence === 'away'
              ? 'warning'
              : 'default'
        }
        variant="dot"
        overlap="circular"
        invisible={member.presence === undefined}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Avatar src={member.avatarUri} alt="" sx={{ width: 36, height: 36 }}>
          {member.name.charAt(0)}
        </Avatar>
      </Badge>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap aria-hidden>
          {member.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block" aria-hidden>
          {member.email}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mt: 0.5 }}
          flexWrap="wrap"
          useFlexGap
        >
          <UserRoleChip
            role={member.role}
            assignableRoles={assignableRoles}
            onChangeRole={onChangeRole}
          />
          {/* The word, not only the dot. */}
          {member.presence ? (
            <Typography variant="caption" color="text.secondary" aria-hidden>
              {presenceLabel}
            </Typography>
          ) : null}
          {member.invitePendingSince ? (
            <Typography variant="caption" color="warning.main" aria-hidden>
              {`Invited ${timeLabel(member.invitePendingSince).split(' (')[0]}`}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </ListItem>
  );
});
