/**
 * The admin screen: list, add, edit, delete and Excel import, all in one place.
 *
 * Wraps `AppDataGrid` from the shared library rather than AG Grid directly, so
 * this screen inherits the theme, preference persistence and editing
 * conventions every other grid in the estate already has.
 *
 * Filtering is server-side. AG Grid will happily filter in the browser, but
 * only across rows it already holds — with 40,000 alumni the client has one
 * page, so a client-side filter silently searches a fraction of the data and
 * looks like it worked.
 */
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText,
  DialogTitle, LinearProgress, MenuItem, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/EditOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColDef, ValueGetterParams } from 'ag-grid-community';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';

// Named export — AppDataGrid.tsx declares no default.
import { AppDataGrid } from '@ui/components/grid/AppDataGrid';

import {
  createAlumni, deleteAlumni, fetchAlumniPage, importAlumni, updateAlumni,
  type AlumniDraft, type AlumniRow,
} from '~/api/alumni';
import AlumniFormDialog from '~/features/admin/AlumniFormDialog';
import ExcelImportDialog from '~/features/admin/ExcelImportDialog';
import { MANDATORY_PLUS_MOBILE, completionPercent } from '~/features/admin/profileRules';

const PAGE_SIZE = 25;
const STATUSES = ['active', 'suspended', 'deleted'] as const;

export default function AlumniAdminGrid() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AlumniRow[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AlumniRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toast, setToast] = useState('');

  // Deferred so typing does not fire a request per keystroke; the grid keeps
  // showing the previous page while the new one loads.
  const deferredSearch = useDeferredValue(search);

  const { data, isFetching } = useQuery({
    queryKey: ['alumni-admin', deferredSearch, status, page],
    queryFn: () => fetchAlumniPage({ search: deferredSearch, status, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  // One invalidation point for every write, so a mutation can never leave the
  // grid showing what it just changed.
  const refresh = useCallback(
    (message: string) => {
      void queryClient.invalidateQueries({ queryKey: ['alumni-admin'] });
      setSelected([]);
      setToast(message);
    },
    [queryClient],
  );

  const save = useMutation({
    mutationFn: (draft: AlumniDraft) =>
      editing ? updateAlumni(editing.id, draft) : createAlumni(draft),
    onSuccess: (row) => {
      setFormOpen(false);
      refresh(editing ? `Updated ${row.fullName}` : `Added ${row.fullName}`);
    },
  });

  const remove = useMutation({
    mutationFn: (ids: number[]) => deleteAlumni(ids),
    onSuccess: (_, ids) => {
      setConfirmDelete(false);
      refresh(`Deleted ${ids.length} record${ids.length === 1 ? '' : 's'}`);
    },
  });

  const bulkImport = useMutation({
    mutationFn: (drafts: AlumniDraft[]) => importAlumni(drafts),
    onSuccess: (outcome) => {
      setImportOpen(false);
      refresh(
        outcome.failed.length === 0
          ? `Imported ${outcome.created} rows`
          : `Imported ${outcome.created}, ${outcome.failed.length} failed`,
      );
    },
  });

  const columnDefs = useMemo<ColDef<AlumniRow>[]>(
    () => [
      { field: 'fullName', headerName: 'Name', flex: 2, minWidth: 170 },
      { field: 'yearOfPassing', headerName: 'Year of passing', width: 150 },
      { field: 'course', headerName: 'Course', flex: 2, minWidth: 180 },
      {
        field: 'mobile',
        headerName: 'Mobile',
        width: 160,
        // An empty cell says nothing; "Not provided" says the field was skipped,
        // which is the difference the completion column is about.
        valueFormatter: (p) => p.value || '—',
      },
      { field: 'email', headerName: 'Email', flex: 2, minWidth: 200 },
      {
        colId: 'completion',
        headerName: 'Completion',
        width: 140,
        valueGetter: (p: ValueGetterParams<AlumniRow>) =>
          p.data ? completionPercent(p.data) : 0,
        cellRenderer: (p: { value: number }) => (
          <Chip
            size="small"
            variant="outlined"
            label={`${p.value}%`}
            color={p.value >= MANDATORY_PLUS_MOBILE ? 'success' : 'warning'}
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          />
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: STATUSES },
      },
      {
        field: 'pendingMedia',
        headerName: 'Pending media',
        width: 150,
        cellStyle: (p) => (p.value > 0 ? { fontWeight: 600 } : undefined),
      },
    ],
    [],
  );

  const busy = save.isPending || remove.isPending || bulkImport.isPending;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label="Search name, email or course"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 280 }}
        />
        <TextField
          size="small"
          select
          label="Status"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">All</MenuItem>
          {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>

        <Box sx={{ flex: 1 }} />

        <Button
          startIcon={<EditIcon />}
          disabled={selected.length !== 1 || busy}
          onClick={() => { setEditing(selected[0]); setFormOpen(true); }}
        >
          Edit
        </Button>
        <Tooltip title={selected.length === 0 ? 'Select rows to delete' : ''}>
          <span>
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              disabled={selected.length === 0 || busy}
              onClick={() => setConfirmDelete(true)}
            >
              Delete{selected.length > 1 ? ` (${selected.length})` : ''}
            </Button>
          </span>
        </Tooltip>
        <Button startIcon={<UploadFileIcon />} disabled={busy} onClick={() => setImportOpen(true)}>
          Import Excel
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={busy}
          onClick={() => { setEditing(null); setFormOpen(true); }}
        >
          Add
        </Button>
      </Stack>

      {busy && <LinearProgress />}

      <Box>
        <AppDataGrid<AlumniRow>
          rowData={data?.rows}
          columnDefs={columnDefs}
          loading={isFetching}
          height={600}
          selectionMode="multiple"
          checkboxSelection
          // Stable identity: without it AG Grid re-renders every row on any
          // change, and inline status edits lose focus mid-keystroke.
          getRowId={(row) => String(row.id)}
          onSelectionChanged={setSelected}
          pagination={false} // server-side already; the grid must not paginate a page
          noRowsMessage="No alumni match these filters."
        />
      </Box>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Button size="small" disabled={page === 0 || isFetching} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {data ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, data.total)} of ${data.total}` : '—'}
        </Typography>
        <Button
          size="small"
          disabled={!data || (page + 1) * PAGE_SIZE >= data.total || isFetching}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </Stack>

      <AlumniFormDialog
        open={formOpen}
        editing={editing}
        saving={save.isPending}
        onClose={() => setFormOpen(false)}
        onSave={(draft) => save.mutate(draft)}
      />

      <ExcelImportDialog
        open={importOpen}
        importing={bulkImport.isPending}
        onClose={() => setImportOpen(false)}
        onImport={(drafts) => bulkImport.mutate(drafts)}
      />

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Delete {selected.length} record{selected.length === 1 ? '' : 's'}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selected.length === 1
              ? `${selected[0]?.fullName} will be removed, along with their education, career and media rows.`
              : 'These records will be removed, along with their education, career and media rows.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={() => remove.mutate(selected.map((r) => r.id))}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Stack>
  );
}
