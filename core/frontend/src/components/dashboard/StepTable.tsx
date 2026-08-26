import { useMemo } from 'react';
import { Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import LaunchIcon from '@mui/icons-material/OpenInNew';
import type { RunStep, StepAction } from '../../types/workflow';
import { fonts, kindMeta, statusMeta, tokens } from '../../theme';
import { StatusDot } from './StatusChip';
import { availableActions, isInspectable, rerunHint } from './ActionButtons';

interface Props {
  steps: RunStep[];
  onInspect: (step: RunStep) => void;
  onAction: (step: RunStep, action: StepAction) => void;
  busy?: boolean;
}

interface Row {
  id: number;
  step: number;
  title: string;
  kind: RunStep['kind'];
  status: RunStep['status'];
  model: string;
  durationMs: number | null;
  costUsd: number;
  artifacts: number;
  raw: RunStep;
}

/** The same 24 steps as a sortable, filterable table for people who scan rather than read. */
export default function StepTable({ steps, onInspect, onAction, busy }: Props) {
  const rows: Row[] = useMemo(
    () =>
      steps.map((s) => ({
        id: s.step,
        step: s.step,
        title: s.title,
        kind: s.kind,
        status: s.status,
        model: s.provenance.modelId ?? '—',
        durationMs: s.durationMs,
        costUsd: s.provenance.costUsd,
        artifacts: s.artifacts.length,
        raw: s,
      })),
    [steps],
  );

  const columns: GridColDef<Row>[] = [
    {
      field: 'step',
      headerName: '#',
      width: 62,
      renderCell: (p: GridRenderCellParams<Row>) => (
        <Typography sx={{ fontFamily: fonts.mono, fontSize: 12.5, color: 'text.secondary' }}>
          {String(p.row.step).padStart(2, '0')}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (p: GridRenderCellParams<Row>) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", height: '100%' }}>
          <StatusDot status={p.row.status} />
          <Typography sx={{ fontSize: 12.5, color: statusMeta[p.row.status].color }}>
            {statusMeta[p.row.status].label}
          </Typography>
        </Stack>
      ),
    },
    { field: 'title', headerName: 'Step', flex: 1, minWidth: 210 },
    {
      field: 'kind',
      headerName: 'Kind',
      width: 96,
      renderCell: (p: GridRenderCellParams<Row>) => (
        <Tooltip title={kindMeta[p.row.kind].hint}>
          <Typography
            sx={{
              fontFamily: fonts.mono,
              fontSize: 10.5,
              letterSpacing: '0.08em',
              color: 'text.secondary',
              border: `1px solid ${tokens.rule}`,
              borderRadius: 0.5,
              px: 0.6,
              py: 0.1,
              cursor: 'help',
            }}
          >
            {p.row.kind}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'model',
      headerName: 'Model',
      width: 190,
      renderCell: (p: GridRenderCellParams<Row>) => (
        <Typography sx={{ fontFamily: fonts.mono, fontSize: 11.5, color: 'text.secondary' }} noWrap>
          {p.row.model}
        </Typography>
      ),
    },
    {
      field: 'durationMs',
      headerName: 'Duration',
      width: 96,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number | null) =>
        value === null ? '—' : value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`,
    },
    {
      field: 'costUsd',
      headerName: 'Cost',
      width: 88,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value: number) => (value > 0 ? `$${value.toFixed(4)}` : '—'),
    },
    { field: 'artifacts', headerName: 'Files', width: 70, align: 'right', headerAlign: 'right' },
    {
      field: 'actions',
      headerName: '',
      width: 190,
      sortable: false,
      filterable: false,
      renderCell: (p: GridRenderCellParams<Row>) => {
        const available = availableActions(p.row.raw);
        const hint = rerunHint(p.row.raw);
        return (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", height: '100%' }}>
            {available.approve.enabled && (
              <Button
                size="small"
                onClick={() => onAction(p.row.raw, 'approve')}
                disabled={busy}
                sx={{ minWidth: 0, px: 1, fontSize: 11.5, color: tokens.signal }}
              >
                Approve
              </Button>
            )}
            {available.reject.enabled && (
              <Button
                size="small"
                onClick={() => onAction(p.row.raw, 'reject')}
                disabled={busy}
                sx={{ minWidth: 0, px: 1, fontSize: 11.5, color: tokens.fail }}
              >
                Reject
              </Button>
            )}
            {/* On a rejected gate this is the only control left, and it opens the
                upload rather than restarting anything — hence the tooltip. */}
            {available.rerun.enabled && (
              <Tooltip title={hint ?? ''}>
                <Button
                  size="small"
                  onClick={() => onAction(p.row.raw, 'rerun')}
                  disabled={busy}
                  sx={{
                    minWidth: 0,
                    px: 1,
                    fontSize: 11.5,
                    color: hint ? tokens.signal : tokens.live,
                  }}
                >
                  Rerun
                </Button>
              </Tooltip>
            )}
            {/* A step that has not run has nothing to detail. */}
            <Tooltip title={isInspectable(p.row.raw) ? '' : 'This step has not run yet'}>
              <span>
                <Button
                  size="small"
                  startIcon={<LaunchIcon sx={{ fontSize: 14 }} />}
                  disabled={!isInspectable(p.row.raw)}
                  onClick={() => onInspect(p.row.raw)}
                  sx={{ minWidth: 0, px: 1, fontSize: 11.5, color: 'text.secondary' }}
                >
                  Details
                </Button>
              </span>
            </Tooltip>
          </Stack>
        );
      },
    },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid<Row>
        rows={rows}
        columns={columns}
        density="compact"
        autoHeight
        disableRowSelectionOnClick
        onRowDoubleClick={(p) => {
          const step = (p.row as Row).raw;
          if (isInspectable(step)) onInspect(step);
        }}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        pageSizeOptions={[10, 25, 50]}
        sx={{
          border: `1px solid ${tokens.rule}`,
          bgcolor: tokens.panel,
          '& .MuiDataGrid-columnHeaders': { bgcolor: tokens.ink },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontFamily: fonts.mono,
            fontSize: 10.5,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: tokens.muted,
          },
          '& .MuiDataGrid-cell': { borderColor: tokens.rule, fontSize: 13 },
          '& .MuiDataGrid-row:hover': { bgcolor: tokens.panelRaised },
          '& .MuiDataGrid-footerContainer': { borderColor: tokens.rule },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
            outline: `1px solid ${tokens.signal}`,
            outlineOffset: -1,
          },
        }}
      />
    </Box>
  );
}
