import Chip from '@mui/material/Chip';
import { useState } from 'react';

import { DataTableWrapper, type DataTableColumn, type SortState } from './DataTableWrapper';
import sample from './sample.json';

interface Invoice {
  id: string;
  customer: string;
  amount: string;
  status: string;
  due: string;
}

export function DataTableWrapperUsage() {
  // Sort, page and selection are controlled here — and in a real app they
  // belong in the URL, so a filtered view can be linked to.
  const [sort, setSort] = useState<SortState>(sample.sort as SortState);
  const [selectedIds, setSelectedIds] = useState<string[]>(sample.selectedIds);
  const [page, setPage] = useState(sample.page);

  const columns: DataTableColumn<Invoice>[] = [
    { id: 'id', header: 'Invoice', render: (row) => row.id, sortable: true },
    { id: 'customer', header: 'Customer', render: (row) => row.customer, sortable: true },
    { id: 'amount', header: 'Amount', render: (row) => row.amount, align: 'right', sortable: true },
    {
      id: 'status',
      header: 'Status',
      render: (row) => (
        <Chip
          size="small"
          variant="outlined"
          label={row.status}
          color={row.status === 'Overdue' ? 'error' : row.status === 'Paid' ? 'success' : 'default'}
        />
      ),
    },
    { id: 'due', header: 'Due', render: (row) => row.due, sortable: true, primary: false },
  ];

  return (
    <DataTableWrapper
      columns={columns}
      rows={sample.rows}
      rowKey={(row) => row.id}
      sort={sort}
      page={page}
      pageSize={sample.pageSize}
      total={sample.total}
      selectedIds={selectedIds}
      onSortChange={setSort}
      onPageChange={setPage}
      onSelectionChange={setSelectedIds}
    />
  );
}
