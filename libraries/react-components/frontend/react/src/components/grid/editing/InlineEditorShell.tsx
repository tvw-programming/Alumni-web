import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';

import type { KeyboardEvent, ReactNode } from 'react';

export interface InlineEditorShellProps {
  /** The input control (TextField, Select, …). */
  children: ReactNode;
  /** Validation or API failure message — shown as a tooltip; null hides it. */
  error: string | null;
  saving: boolean;
  canApply: boolean;
  onApply: () => void;
  onCancel: () => void;
}

/**
 * Shared presentation for every inline editor, rendered INSIDE the cell
 * (no popup): a compact single-row layout — input + ✓ Apply / ✕ Cancel icon
 * buttons — sized to the grid's row height. Errors (validation or save
 * failures) surface as a tooltip anchored to the editor.
 *
 * Keyboard: Enter applies, Escape cancels (both stop propagation so AG Grid's
 * default commit/navigation doesn't race the button-driven flow).
 */
export function InlineEditorShell({
  children,
  error,
  saving,
  canApply,
  onApply,
  onCancel,
}: InlineEditorShellProps) {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (canApply) onApply();
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
    }
  };

  return (
    <Tooltip title={error ?? ''} open={error !== null} arrow placement="top">
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.25}
        onKeyDown={handleKeyDown}
        sx={{
          width: '100%',
          height: '100%',
          px: 0.75,
          bgcolor: 'background.paper',
          boxShadow: (theme) => `inset 0 0 0 1.5px ${theme.palette.primary.main}`,
        }}
      >
        <Box flex={1} minWidth={0}>
          {children}
        </Box>

        <Tooltip title="Apply">
          <span>
            <IconButton
              size="small"
              color="primary"
              aria-label="Apply"
              disabled={!canApply}
              onClick={onApply}
              sx={{ p: 0.25 }}
            >
              {saving ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <CheckIcon sx={{ fontSize: '1rem' }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Cancel">
          <span>
            <IconButton
              size="small"
              aria-label="Cancel"
              disabled={saving}
              onClick={onCancel}
              sx={{ p: 0.25 }}
            >
              <CloseIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Tooltip>
  );
}
