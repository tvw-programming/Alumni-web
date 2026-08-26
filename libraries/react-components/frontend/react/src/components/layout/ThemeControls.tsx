import TuneIcon from '@mui/icons-material/Tune';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useState } from 'react';

import { ThemeModeToggle, ThemeSettingsPanel } from '@/theme';

/**
 * The theme-settings icon (opens the ThemeSettingsPanel drawer) plus the
 * dark/light mode toggle. Shared by both the public and admin app bars so
 * theming has a single source of truth across shells.
 */
export function ThemeControls() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <Tooltip title="Theme settings">
        <IconButton
          color="inherit"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open theme settings"
        >
          <TuneIcon />
        </IconButton>
      </Tooltip>
      <ThemeModeToggle />
      <Drawer anchor="right" open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <ThemeSettingsPanel />
      </Drawer>
    </>
  );
}
