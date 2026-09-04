import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { forwardRef, type ReactNode } from 'react';

export interface PreferenceIconButtonProps {
  title: string;
  icon: ReactNode;
  /** Highlights the button border/colour while its popup is open. */
  active?: boolean;
  /**
   * When true renders a small red badge dot on the icon, signalling that
   * non-default preferences are applied for this section.
   */
  badgeActive?: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Compact icon-button trigger for a preference popup.
 * - `active`      → primary border + colour while the popup is open
 * - `badgeActive` → red dot badge indicating applied (non-default) settings
 */
export const PreferenceIconButton = forwardRef<HTMLButtonElement, PreferenceIconButtonProps>(
  function PreferenceIconButton(
    { title, icon, active = false, badgeActive = false, onClick },
    ref,
  ) {
    return (
      <Tooltip title={title}>
        <IconButton
          ref={ref}
          size="small"
          aria-label={title}
          color={active ? 'primary' : 'default'}
          onClick={onClick}
          sx={{
            border: 1,
            borderColor: active ? 'primary.main' : 'divider',
            borderRadius: 1.5,
          }}
        >
          <Badge
            variant="dot"
            color="error"
            invisible={!badgeActive}
            sx={{
              '& .MuiBadge-dot': {
                width: 7,
                height: 7,
                minWidth: 'unset',
                top: 1,
                right: 1,
              },
            }}
          >
            {icon}
          </Badge>
        </IconButton>
      </Tooltip>
    );
  },
);
