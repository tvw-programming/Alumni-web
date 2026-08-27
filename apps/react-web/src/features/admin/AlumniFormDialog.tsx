/**
 * Add or edit one alumnus.
 *
 * Completion is shown while typing, not after saving. The percentage is the
 * only feedback that makes an optional field feel worth filling in, and showing
 * it afterwards is showing it too late to act on.
 */
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Grid, IconButton, LinearProgress, Stack, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import { useEffect, useMemo, useState } from 'react';

import { EMPTY_DRAFT, type AlumniDraft, type AlumniRow } from '~/api/alumni';
import {
  MANDATORY_PLUS_MOBILE, completionPercent, normaliseMobile, validateAlumni,
} from '~/features/admin/profileRules';

interface Props {
  open: boolean;
  /** null adds, a row edits. */
  editing: AlumniRow | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (draft: AlumniDraft) => void;
}

const FIELDS: { key: keyof AlumniDraft; label: string; required?: boolean; span: number; type?: string }[] = [
  { key: 'fullName', label: 'Name', required: true, span: 12 },
  { key: 'yearOfPassing', label: 'Year of passing', required: true, span: 6, type: 'number' },
  { key: 'course', label: 'Course', required: true, span: 6 },
  { key: 'mobile', label: 'Mobile', span: 6 },
  { key: 'email', label: 'Email', span: 6, type: 'email' },
  { key: 'city', label: 'City', span: 6 },
  { key: 'headline', label: 'Headline', span: 12 },
];

export default function AlumniFormDialog({ open, editing, saving, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<AlumniDraft>(EMPTY_DRAFT);
  // Errors appear on blur or on a failed save, never while first typing a
  // field — a form that turns red on the first keystroke reads as hostile.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(editing ? pickDraft(editing) : EMPTY_DRAFT);
    setTouched({});
    setAttempted(false);
  }, [open, editing]);

  const errors = useMemo(() => validateAlumni(draft), [draft]);
  const percent = completionPercent(draft);
  const blocked = Object.keys(errors).length > 0;

  function addExtra() {
    setDraft((d) => {
      let name = 'New field';
      let n = 2;
      while (name in d.extra) name = `New field ${n++}`;
      return { ...d, extra: { ...d.extra, [name]: '' } };
    });
  }

  function removeExtra(key: string) {
    setDraft((d) => {
      const next = { ...d.extra };
      delete next[key];
      return { ...d, extra: next };
    });
  }

  function renameExtra(from: string, to: string) {
    setDraft((d) => {
      const next: Record<string, string> = {};
      // Rebuilt in order rather than delete-then-add: the latter moves the row
      // being renamed to the bottom on every keystroke.
      for (const [k, v] of Object.entries(d.extra)) next[k === from ? to : k] = v;
      return { ...d, extra: next };
    });
  }

  function handleSave() {
    setAttempted(true);
    if (blocked) return;
    onSave({
      ...draft,
      fullName: draft.fullName.trim(),
      // Stored canonically, so two people who typed the same number differently
      // compare equal. Matches alumni_profiles_mobile_format.
      mobile: draft.mobile ? normaliseMobile(draft.mobile) : '',
      extra: Object.fromEntries(
        Object.entries(draft.extra).filter(([k, v]) => k.trim() !== '' && v.trim() !== ''),
      ),
    });
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? `Edit ${editing.fullName}` : 'Add alumnus'}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">Profile completion</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {percent}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={percent}
              // Semantic, not decorative: amber below the mandatory-plus-mobile
              // mark, green at or above it.
              color={percent >= MANDATORY_PLUS_MOBILE ? 'success' : 'warning'}
              sx={{ height: 6, borderRadius: 3 }}
            />
            {percent < MANDATORY_PLUS_MOBILE && !draft.mobile && (
              <Typography variant="caption" color="text.secondary">
                Adding a mobile number takes this to {MANDATORY_PLUS_MOBILE}%.
              </Typography>
            )}
          </Box>

          {attempted && blocked && (
            <Alert severity="error">Fix the highlighted fields before saving.</Alert>
          )}

          <Grid container spacing={2}>
            {FIELDS.map((field) => {
              const show = (touched[field.key] || attempted) && errors[field.key];
              return (
                <Grid key={field.key} size={{ xs: 12, sm: field.span }}>
                  <TextField
                    fullWidth
                    size="small"
                    type={field.type ?? 'text'}
                    label={field.label}
                    required={field.required}
                    value={draft[field.key] ?? ''}
                    error={Boolean(show)}
                    helperText={show ? errors[field.key] : ' '}
                    onBlur={() => setTouched((t) => ({ ...t, [field.key]: true }))}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [field.key]:
                          field.type === 'number'
                            ? e.target.value === '' ? null : Number(e.target.value)
                            : e.target.value,
                      }))
                    }
                  />
                </Grid>
              );
            })}
          </Grid>

          <Divider />

          <Box>
            <Typography variant="subtitle2">Additional information</Typography>
            <Typography variant="caption" color="text.secondary">
              Anything the standard fields do not cover — hostel, batch section, donor tier.
              Stored as JSON against this person; spreadsheet columns we do not recognise land
              here too.
            </Typography>

            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {Object.entries(draft.extra).map(([key, value]) => (
                <Stack key={key} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="Label"
                    value={key}
                    sx={{ width: 200 }}
                    onChange={(e) => renameExtra(key, e.target.value)}
                  />
                  <TextField
                    size="small"
                    label="Value"
                    value={value}
                    fullWidth
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, extra: { ...d.extra, [key]: e.target.value } }))
                    }
                  />
                  <IconButton aria-label={`Remove ${key}`} onClick={() => removeExtra(key)}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Box>
                <Button size="small" startIcon={<AddIcon />} onClick={addExtra}>
                  Add field
                </Button>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {editing ? 'Save changes' : 'Add alumnus'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function pickDraft(row: AlumniRow): AlumniDraft {
  const { fullName, yearOfPassing, course, mobile, email, city, headline, extra } = row;
  // Copied, not referenced: editing then cancelling must not mutate the row
  // still sitting in the grid.
  return { fullName, yearOfPassing, course, mobile, email, city, headline, extra: { ...extra } };
}
