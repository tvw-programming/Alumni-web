// components/forms/fields/FileUploadField.tsx
//
// Schema-driven file upload control.
//
// Value shape: ALWAYS `File[]`, even when `multiple` is false (the array just
// holds at most one entry). A single consistent shape keeps validation,
// previews and reset behaviour uniform — callers unwrap with `files[0]`.
//
// Validation runs in two layers:
//   1. At selection time — files violating type/size/count limits are rejected
//      immediately and never enter form state, with the reason shown inline.
//      Failing only at submit time would be poor UX.
//   2. As form-level rules (see `buildFileValidators`, called from SchemaField)
//      — so a form-level validate pass still enforces required / min / max /
//      total size regardless of how the value got there.

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';

import { asFileArray } from './valueCoercion';

import type { FieldRendererProps, FieldValue, ValidatorMap } from './types';
import type { FieldConfigV2, FileFieldOptions } from '@/types/formSystem';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const MB = 1024 * 1024;

// eslint-disable-next-line react-refresh/only-export-components -- File helpers intentionally stay colocated with the specialized renderer.
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(2)} MB`;
}

/**
 * Matches a file against one `accept` token. Supports the three forms the
 * native input accepts:
 *   - ".pdf"          extension
 *   - "image/*"       wildcard MIME group
 *   - "application/pdf" exact MIME
 */
function matchesAcceptToken(file: File, token: string): boolean {
  const t = token.trim().toLowerCase();
  if (!t) return true;

  if (t.startsWith('.')) {
    return file.name.toLowerCase().endsWith(t);
  }
  if (t.endsWith('/*')) {
    const group = t.slice(0, -2);
    return (file.type || '').toLowerCase().startsWith(`${group}/`);
  }
  return (file.type || '').toLowerCase() === t;
}

// eslint-disable-next-line react-refresh/only-export-components -- File helpers intentionally stay colocated with the specialized renderer.
export function isFileTypeAllowed(file: File, accept?: string[]): boolean {
  if (!accept || accept.length === 0) return true;
  return accept.some((token) => matchesAcceptToken(file, token));
}

function isImage(file: File): boolean {
  return (file.type || '').startsWith('image/');
}

/* ------------------------------------------------------------------ */
/* Form-level validators (framework-agnostic: value -> true | message)  */
/* ------------------------------------------------------------------ */

/**
 * Rules contributed for a `file` field. Kept here so all file semantics live
 * in one module; `SchemaField` runs these as part of its combined validator.
 */
// eslint-disable-next-line react-refresh/only-export-components -- Renderer-specific validator intentionally lives beside its component.
export function buildFileValidators(field: FieldConfigV2): ValidatorMap {
  const opts: FileFieldOptions = field.file ?? {};
  const validators: ValidatorMap = {};

  if (field.required) {
    validators.requiredFile = (value: FieldValue) =>
      asFileArray(value).length > 0 || `${field.label} is required`;
  }

  if (opts.minFiles) {
    validators.minFiles = (value: FieldValue) =>
      asFileArray(value).length >= opts.minFiles! ||
      `Select at least ${opts.minFiles} file${opts.minFiles === 1 ? '' : 's'}`;
  }

  if (opts.maxFiles) {
    validators.maxFiles = (value: FieldValue) =>
      asFileArray(value).length <= opts.maxFiles! ||
      `Select at most ${opts.maxFiles} file${opts.maxFiles === 1 ? '' : 's'}`;
  }

  if (opts.maxFileSizeMb) {
    validators.maxFileSize = (value: FieldValue) => {
      const oversized = asFileArray(value).filter((f) => f.size > opts.maxFileSizeMb! * MB);
      return (
        oversized.length === 0 ||
        `${oversized.map((f) => f.name).join(', ')} exceeds ${opts.maxFileSizeMb} MB`
      );
    };
  }

  if (opts.maxTotalSizeMb) {
    validators.maxTotalSize = (value: FieldValue) => {
      const total = asFileArray(value).reduce((sum, f) => sum + f.size, 0);
      return (
        total <= opts.maxTotalSizeMb! * MB ||
        `Total size ${formatBytes(total)} exceeds ${opts.maxTotalSizeMb} MB`
      );
    };
  }

  if (opts.accept?.length) {
    validators.fileType = (value: FieldValue) => {
      const bad = asFileArray(value).filter((f) => !isFileTypeAllowed(f, opts.accept));
      return (
        bad.length === 0 || `${bad.map((f) => f.name).join(', ')} is not an accepted file type`
      );
    };
  }

  return validators;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function FileUploadField({
  field,
  value,
  error,
  disabled = false,
  onChange,
  onBlur,
}: FieldRendererProps) {
  const opts: FileFieldOptions = field.file ?? {};
  const {
    accept,
    multiple = false,
    maxFileSizeMb,
    maxFiles,
    maxTotalSizeMb,
    showPreview = true,
    dropzone = true,
    helperText,
  } = opts;

  const inputRef = useRef<HTMLInputElement>(null);
  const [rejections, setRejections] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const files = useMemo<File[]>(() => asFileArray(value), [value]);

  /**
   * Object URLs for image thumbnails. Revoked whenever the file list changes
   * and on unmount — without this each re-selection leaks a blob into memory
   * for the lifetime of the document.
   */
  const previews = useMemo(() => {
    if (!showPreview) return new Map<File, string>();
    const map = new Map<File, string>();
    files.forEach((f) => {
      if (isImage(f)) map.set(f, URL.createObjectURL(f));
    });
    return map;
  }, [files, showPreview]);

  useEffect(() => {
    return () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const acceptAttr = accept?.join(',');

  /** Applies every limit and splits the incoming batch into kept vs rejected. */
  const screen = useCallback(
    (incoming: File[], existing: File[]) => {
      const accepted: File[] = [];
      const reasons: string[] = [];
      let runningTotal = existing.reduce((sum, f) => sum + f.size, 0);
      let count = existing.length;

      incoming.forEach((f) => {
        if (!isFileTypeAllowed(f, accept)) {
          reasons.push(`"${f.name}" — type not allowed (${accept?.join(', ')})`);
          return;
        }
        if (maxFileSizeMb && f.size > maxFileSizeMb * MB) {
          reasons.push(
            `"${f.name}" — ${formatBytes(f.size)} exceeds the ${maxFileSizeMb} MB limit`,
          );
          return;
        }
        const limit = multiple ? maxFiles : 1;
        if (limit && count >= limit) {
          reasons.push(`"${f.name}" — max ${limit} file${limit === 1 ? '' : 's'} allowed`);
          return;
        }
        if (maxTotalSizeMb && runningTotal + f.size > maxTotalSizeMb * MB) {
          reasons.push(`"${f.name}" — would exceed the ${maxTotalSizeMb} MB total limit`);
          return;
        }

        accepted.push(f);
        runningTotal += f.size;
        count += 1;
      });

      return { accepted, reasons };
    },
    [accept, maxFileSizeMb, maxFiles, maxTotalSizeMb, multiple],
  );

  const addFiles = useCallback(
    (incoming: File[]) => {
      // Single-file mode replaces rather than appends.
      const existing = multiple ? files : [];
      const { accepted, reasons } = screen(incoming, existing);

      setRejections(reasons);
      if (accepted.length > 0) {
        onChange(multiple ? [...existing, ...accepted] : accepted.slice(0, 1));
      }
      onBlur();
    },
    [files, multiple, onBlur, onChange, screen],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      addFiles(Array.from(e.target.files ?? []));
      // Reset so picking the SAME file again still fires a change event.
      if (inputRef.current) inputRef.current.value = '';
    },
    [addFiles],
  );

  const handleRemove = useCallback(
    (target: File) => {
      setRejections([]);
      onChange(files.filter((f) => f !== target));
      onBlur();
    },
    [files, onBlur, onChange],
  );

  const handleClearAll = useCallback(() => {
    setRejections([]);
    onChange([]);
    onBlur();
  }, [onBlur, onChange]);

  const handleDrag = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (disabled) return;
      addFiles(Array.from(e.dataTransfer.files ?? []));
    },
    [addFiles, disabled],
  );

  const openPicker = useCallback(() => inputRef.current?.click(), []);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const hasError = Boolean(error);

  const constraintChips = [
    accept?.length ? `types: ${accept.join(', ')}` : null,
    maxFileSizeMb ? `max ${maxFileSizeMb} MB / file` : null,
    maxTotalSizeMb ? `max ${maxTotalSizeMb} MB total` : null,
    multiple ? `up to ${maxFiles ?? '∞'} files` : 'single file',
  ].filter(Boolean) as string[];

  return (
    <FormControl
      component="fieldset"
      required={field.required}
      error={hasError}
      disabled={disabled}
      margin="normal"
      fullWidth
      sx={{ display: 'block' }}
    >
      <FormLabel component="legend" sx={{ '& .MuiFormLabel-asterisk': { color: 'error.main' } }}>
        {field.label}
      </FormLabel>

      <input
        ref={inputRef}
        type="file"
        hidden
        accept={acceptAttr}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        data-testid={`${field.name}-input`}
      />

      <Box
        onDragEnter={dropzone ? handleDrag : undefined}
        onDragOver={dropzone ? handleDrag : undefined}
        onDragLeave={dropzone ? handleDrag : undefined}
        onDrop={dropzone ? handleDrop : undefined}
        onClick={disabled ? undefined : openPicker}
        sx={{
          mt: 1,
          p: 3,
          textAlign: 'center',
          borderRadius: 2,
          border: '2px dashed',
          borderColor: hasError ? 'error.main' : dragActive ? 'primary.main' : 'divider',
          // `error.lighter` is not part of MUI's default palette, so tint the
          // error state from the theme's error colour instead.
          backgroundColor: dragActive
            ? 'action.hover'
            : hasError
              ? (theme) => alpha(theme.palette.error.main, 0.06)
              : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'border-color .15s, background-color .15s',
          '&:hover': disabled ? undefined : { borderColor: 'primary.main' },
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 40, color: hasError ? 'error.main' : 'primary.main' }} />
        <Typography variant="body2" sx={{ mt: 1 }}>
          {dropzone ? 'Drag & drop files here, or ' : ''}
          <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
            browse
          </Box>
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}
        >
          {constraintChips.map((c) => (
            <Chip key={c} size="small" variant="outlined" label={c} />
          ))}
        </Stack>
      </Box>

      {rejections.length > 0 && (
        <Alert severity="warning" sx={{ mt: 1 }} onClose={() => setRejections([])}>
          {rejections.map((r) => (
            <div key={r}>{r}</div>
          ))}
        </Alert>
      )}

      {files.length > 0 && (
        <>
          <List dense sx={{ mt: 1 }}>
            {files.map((f) => (
              <ListItem
                key={`${f.name}-${f.size}-${f.lastModified}`}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => handleRemove(f)}
                    disabled={disabled}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 0.5 }}
              >
                <ListItemAvatar>
                  {previews.get(f) ? (
                    <Avatar variant="rounded" src={previews.get(f)} alt={f.name} />
                  ) : (
                    <Avatar variant="rounded">
                      <InsertDriveFileIcon />
                    </Avatar>
                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={f.name}
                  secondary={`${formatBytes(f.size)}${f.type ? ` · ${f.type}` : ''}`}
                  primaryTypographyProps={{ noWrap: true }}
                />
              </ListItem>
            ))}
          </List>

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {files.length} file{files.length === 1 ? '' : 's'} · {formatBytes(totalSize)}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button size="small" onClick={handleClearAll} disabled={disabled}>
              Clear all
            </Button>
          </Stack>
        </>
      )}

      <FormHelperText sx={{ ml: 0 }}>{error ?? helperText ?? ' '}</FormHelperText>
    </FormControl>
  );
}

export default memo(FileUploadField);
