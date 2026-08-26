import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { PreferenceActions } from './PreferenceActions';
import { PreferenceSection } from './PreferenceSection';
import { usePreferenceDraft } from './usePreferenceDraft';
import { usePreferenceSave } from './usePreferenceSave';

import type { PreferenceSectionConfig } from './types';

export interface PreferencePopupProps<TDraft> {
  config: PreferenceSectionConfig<TDraft>;
  open: boolean;
  onClose: () => void;
}

/**
 * The reusable preference popup: a compact dialog centered in the viewport
 * (40% width by default) with a header, the section's controls, and the
 * shared Apply/Save/Cancel footer.
 *
 * Edit model: controls mutate a local *draft* only. The committed value is
 * untouched until the user chooses
 *  - Apply → `onApply(draft)` immediately, no API; or
 *  - Save  → POST to `saveEndpoint`, then `onApply(serverDraft)` +
 *    `onSaveSuccess(serverDraft)` once the API confirms.
 * Cancel (or closing) discards the draft. The popup cannot be dismissed while
 * a save is in flight, which pairs with the duplicate-submit guard.
 */
export function PreferencePopup<TDraft>({ config, open, onClose }: PreferencePopupProps<TDraft>) {
  const { draft, dirty, updateDraft, resetDraft } = usePreferenceDraft(config.value, open);
  const { saving, error, save, clearError } = usePreferenceSave<TDraft>(
    config.saveEndpoint,
    config.id,
  );

  const closeOnSave = config.closeOnSave ?? true;
  const closeOnApply = config.closeOnApply ?? false;
  const bodyMaxHeight = config.bodyMaxHeight ?? 420;

  const handleClose = () => {
    if (saving) return; // never dismiss mid-save
    clearError();
    onClose();
  };

  const handleApply = () => {
    config.onApply(draft);
    resetDraft(draft); // draft is now the committed value
    if (closeOnApply) handleClose();
  };

  const handleSave = () => {
    void save(draft).then((saved) => {
      if (saved == null) return; // failed or duplicate — error state shows
      config.onApply(saved);
      config.onSaveSuccess?.(saved);
      resetDraft(saved);
      if (closeOnSave) {
        clearError();
        onClose();
      }
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      // Explicitly centered horizontally + vertically.
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            width: config.width ?? '40vw',
            minWidth: 320,
            maxWidth: '94vw',
            display: 'flex',
            flexDirection: 'column',
            // Ensure the dialog is always centered in the viewport
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            m: 0,
          },
        },
      }}
    >
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="center" px={2} py={1.25}>
        <Box display="inline-flex" color="primary.main">
          {config.icon}
        </Box>
        <Box flex={1} minWidth={0}>
          {/* Same level as form/grid section titles (subtitle1/600). */}
          <Typography fontWeight={600} variant="subtitle1" noWrap>
            {config.title}
          </Typography>
          {config.description && (
            <Typography variant="body2" color="text.secondary" noWrap display="block">
              {config.description}
            </Typography>
          )}
        </Box>
        <IconButton size="small" aria-label="Close" disabled={saving} onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Divider />

      {/* Body — scrolls only when the section opts in via bodyMaxHeight. */}
      <Box
        px={2}
        py={1.5}
        sx={
          bodyMaxHeight === 'none'
            ? { overflow: 'hidden' }
            : { overflowY: 'auto', maxHeight: bodyMaxHeight }
        }
      >
        <PreferenceSection config={config} draft={draft} onDraftChange={updateDraft} />
      </Box>
      <Divider />

      {/* Footer */}
      <Box px={2} py={1.25}>
        <PreferenceActions
          dirty={dirty}
          saving={saving}
          error={error}
          onCancel={handleClose}
          onApply={handleApply}
          onSave={handleSave}
        />
      </Box>
    </Dialog>
  );
}
