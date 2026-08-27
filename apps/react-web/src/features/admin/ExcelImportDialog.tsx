/**
 * Import alumni from a spreadsheet.
 *
 * Three steps, deliberately: choose a file, see what will happen, then commit.
 * An importer that writes on file-select gives no chance to notice that the
 * wrong file was picked, and undoing 300 rows is far more work than reading a
 * summary.
 */
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Link, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useRef, useState } from 'react';

import type { AlumniDraft } from '~/api/alumni';
import { buildTemplate, parseWorkbook } from '~/features/admin/excelWorkbook';
import { validateAlumni } from '~/features/admin/profileRules';

interface Rejected {
  rowNumber: number;
  name: string;
  reasons: string[];
}

interface Props {
  open: boolean;
  importing?: boolean;
  onClose: () => void;
  onImport: (drafts: AlumniDraft[]) => void;
}

export default function ExcelImportDialog({ open, importing, onClose, onImport }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [accepted, setAccepted] = useState<AlumniDraft[]>([]);
  const [rejected, setRejected] = useState<Rejected[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function downloadTemplate() {
    const blob = await buildTemplate();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'alumni-import-template.xlsx';
    link.click();
    // Revoking immediately would race the download in some browsers; a tick is
    // enough and the object is small.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    try {
      const rows = await parseWorkbook(file);
      const ok: AlumniDraft[] = [];
      const bad: Rejected[] = [];

      for (const { rowNumber, draft } of rows) {
        // The same validator the form uses, so a row rejected here is rejected
        // for the same stated reason it would be in the dialog.
        const errors = validateAlumni(draft);
        if (Object.keys(errors).length === 0) {
          ok.push(draft as AlumniDraft);
        } else {
          bad.push({
            rowNumber,
            name: String(draft.fullName ?? '(no name)'),
            reasons: Object.values(errors),
          });
        }
      }
      setAccepted(ok);
      setRejected(bad);
    } catch (e) {
      setAccepted([]);
      setRejected([]);
      setError(e instanceof Error ? e.message : 'That file could not be read.');
    }
  }

  function reset() {
    setFileName('');
    setAccepted([]);
    setRejected([]);
    setError(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  const parsed = accepted.length + rejected.length > 0;

  return (
    <Dialog open={open} onClose={importing ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Import alumni from Excel</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Alert severity="info" icon={<DownloadIcon />}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <span>First time?</span>
              <Link component="button" type="button" onClick={downloadTemplate} sx={{ fontWeight: 600 }}>
                Download the sample Excel format
              </Link>
              <span>— it has the required columns and one filled example row.</span>
            </Stack>
          </Alert>

          <Box>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => fileInput.current?.click()}
              disabled={importing}
            >
              {fileName ? 'Choose a different file' : 'Choose .xlsx file'}
            </Button>
            {fileName && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {fileName}
              </Typography>
            )}
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {parsed && (
            <Stack direction="row" spacing={1}>
              <Chip color="success" variant="outlined" label={`${accepted.length} ready to import`} />
              {rejected.length > 0 && (
                <Chip color="error" variant="outlined" label={`${rejected.length} will be skipped`} />
              )}
            </Stack>
          )}

          {rejected.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Skipped rows — the rest will still import
              </Typography>
              <Box sx={{ maxHeight: 260, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 80 }}>Row</TableCell>
                      <TableCell sx={{ width: 200 }}>Name</TableCell>
                      <TableCell>Why</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rejected.map((row) => (
                      <TableRow key={row.rowNumber}>
                        {/* The sheet's own row number, so it can be found and fixed. */}
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.rowNumber}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.reasons.join(' ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }} disabled={importing}>Cancel</Button>
        <Button
          variant="contained"
          disabled={accepted.length === 0 || importing}
          onClick={() => onImport(accepted)}
        >
          Import {accepted.length > 0 ? `${accepted.length} row${accepted.length === 1 ? '' : 's'}` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
