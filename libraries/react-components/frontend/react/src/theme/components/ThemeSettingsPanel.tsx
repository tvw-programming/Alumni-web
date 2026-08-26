import CheckIcon from '@mui/icons-material/Check';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { THEME_CONFIG } from '../config';
import { useThemeSettings } from '../ThemeSettingsContext';

import type { ThemeMode, ThemeStyle } from '../types';
import type { ChangeEvent, MouseEvent } from 'react';

/**
 * Full settings panel: mode, style, primary and secondary color.
 * Drop it into a Drawer, Dialog, or a page — it is self-contained.
 */

interface ColorPickerRowProps {
  readonly label: string;
  readonly value: string;
  readonly presets: readonly string[];
  readonly onChange: (color: string) => void;
}

function ColorPickerRow({ label, value, presets, onChange }: ColorPickerRowProps) {
  const handleCustomChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {presets.map((color) => {
          const selected = color.toLowerCase() === value.toLowerCase();
          return (
            <Tooltip key={color} title={color}>
              <ButtonBase
                onClick={() => onChange(color)}
                aria-label={`${label}: ${color}`}
                aria-pressed={selected}
                sx={(theme) => ({
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: color,
                  border: `2px solid ${
                    selected ? theme.palette.text.primary : alpha(theme.palette.text.primary, 0.2)
                  }`,
                  color: theme.palette.getContrastText(color),
                })}
              >
                {selected && <CheckIcon fontSize="small" />}
              </ButtonBase>
            </Tooltip>
          );
        })}
        <Tooltip title="Custom color">
          <Box
            component="input"
            type="color"
            value={value}
            onChange={handleCustomChange}
            aria-label={`${label}: custom color`}
            sx={(theme) => ({
              width: 40,
              height: 32,
              p: 0,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              bgcolor: 'transparent',
              cursor: 'pointer',
            })}
          />
        </Tooltip>
      </Stack>
    </Box>
  );
}

export function ThemeSettingsPanel() {
  const { settings, setMode, setStyle, setPrimaryColor, setSecondaryColor, resetSettings } =
    useThemeSettings();

  const handleModeChange = (_event: MouseEvent<HTMLElement>, mode: ThemeMode | null) => {
    if (mode !== null) {
      setMode(mode);
    }
  };

  const handleStyleChange = (_event: MouseEvent<HTMLElement>, style: ThemeStyle | null) => {
    if (style !== null) {
      setStyle(style);
    }
  };

  return (
    <Stack spacing={3} sx={{ p: 2, minWidth: 280 }}>
      <Typography variant="h6">Theme settings</Typography>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Mode
        </Typography>
        <ToggleButtonGroup
          value={settings.mode}
          exclusive
          onChange={handleModeChange}
          size="small"
          fullWidth
          aria-label="Theme mode"
        >
          <ToggleButton value="light">Light</ToggleButton>
          <ToggleButton value="dark">Dark</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Style
        </Typography>
        <ToggleButtonGroup
          value={settings.style}
          exclusive
          onChange={handleStyleChange}
          size="small"
          fullWidth
          aria-label="Theme style"
        >
          <ToggleButton value="plain">Plain</ToggleButton>
          <ToggleButton value="glass">Gradient glass</ToggleButton>
          <ToggleButton value="glass3d">3D Gradient Glass</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <ColorPickerRow
        label="Primary color"
        value={settings.primaryColor}
        presets={THEME_CONFIG.presetPrimaryColors}
        onChange={setPrimaryColor}
      />

      <ColorPickerRow
        label="Secondary color"
        value={settings.secondaryColor}
        presets={THEME_CONFIG.presetSecondaryColors}
        onChange={setSecondaryColor}
      />

      <Button variant="outlined" color="inherit" onClick={resetSettings}>
        Reset to defaults
      </Button>
    </Stack>
  );
}
