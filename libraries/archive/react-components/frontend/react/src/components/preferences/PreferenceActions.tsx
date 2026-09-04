import CheckIcon from '@mui/icons-material/Check';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

export interface PreferenceActionsProps {
  /** Draft differs from the committed value — enables Apply/Save. */
  dirty: boolean;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  /** Commit the draft to app state only (no API). */
  onApply: () => void;
  /** Persist via API, then commit the server response. */
  onSave: () => void;
}

/**
 * Shared action footer for preference popups. Keeps the two commit modes
 * visually and behaviorally distinct: Apply is the instant local commit,
 * Save is the persisted one (spinner + duplicate-submit protection upstream).
 */
export function PreferenceActions({
  dirty,
  saving,
  error,
  onCancel,
  onApply,
  onSave,
}: PreferenceActionsProps) {
  return (
    <Stack spacing={1}>
      {error && (
        <Alert severity="error" variant="outlined" sx={{ py: 0 }}>
          {error}
        </Alert>
      )}
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button size="small" color="inherit" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<CheckIcon fontSize="small" />}
          disabled={!dirty || saving}
          onClick={onApply}
        >
          Apply
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={
            saving ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <SaveOutlinedIcon fontSize="small" />
            )
          }
          disabled={!dirty || saving}
          onClick={onSave}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Stack>
    </Stack>
  );
}
