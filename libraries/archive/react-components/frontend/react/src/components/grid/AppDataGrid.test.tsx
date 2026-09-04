import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppDataGrid } from './AppDataGrid';

import type { ColDef } from 'ag-grid-community';

interface Row {
  id: number;
  name: string;
  category: string;
}

const ROWS: Row[] = [
  { id: 1, name: 'Alpha', category: 'tools' },
  { id: 2, name: 'Bravo', category: 'toys' },
  { id: 3, name: 'Charlie', category: 'tools' },
];

const COLUMNS: ColDef<Row>[] = [
  { field: 'name', headerName: 'Name' },
  { field: 'category', headerName: 'Category' },
];

/** AG Grid renders asynchronously; wait for a known cell before asserting. */
async function findGridCell(text: string) {
  return waitFor(() => screen.getByText(text), { timeout: 4000 });
}

describe('AppDataGrid', () => {
  it('renders the supplied rows and headers', async () => {
    render(<AppDataGrid rowData={ROWS} columnDefs={COLUMNS} />);

    expect(await findGridCell('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('shows the custom empty message rather than a blank grid', async () => {
    render(<AppDataGrid rowData={[]} columnDefs={COLUMNS} noRowsMessage="Nothing to show yet" />);

    expect(await findGridCell('Nothing to show yet')).toBeInTheDocument();
  });

  it('treats undefined rowData as not-yet-loaded without crashing', async () => {
    render(<AppDataGrid rowData={undefined} columnDefs={COLUMNS} loading />);

    // The header still renders while rows are pending, so the layout does not
    // jump when data arrives.
    expect(await findGridCell('Name')).toBeInTheDocument();
  });

  it('filters rows through quickFilterText', async () => {
    const { rerender } = render(<AppDataGrid rowData={ROWS} columnDefs={COLUMNS} />);
    await findGridCell('Alpha');

    rerender(<AppDataGrid rowData={ROWS} columnDefs={COLUMNS} quickFilterText="charlie" />);

    await waitFor(() => {
      expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('hands the grid api to the parent on ready', async () => {
    const onGridReady = vi.fn();
    render(<AppDataGrid rowData={ROWS} columnDefs={COLUMNS} onGridReady={onGridReady} />);

    await waitFor(() => {
      expect(onGridReady).toHaveBeenCalledTimes(1);
    });
    // The parent needs the real api object to run transactions against it.
    expect(onGridReady.mock.calls[0][0]).toHaveProperty('applyTransaction');
  });

  it('reports the clicked row to the parent', async () => {
    const user = userEvent.setup();
    const onRowClicked = vi.fn();
    render(<AppDataGrid rowData={ROWS} columnDefs={COLUMNS} onRowClicked={onRowClicked} />);

    await user.click(await findGridCell('Bravo'));

    await waitFor(() => {
      expect(onRowClicked).toHaveBeenCalledWith(ROWS[1]);
    });
  });

  it('emits selected rows when selection is enabled', async () => {
    const user = userEvent.setup();
    const onSelectionChanged = vi.fn();
    render(
      <AppDataGrid
        rowData={ROWS}
        columnDefs={COLUMNS}
        selectionMode="single"
        onSelectionChanged={onSelectionChanged}
      />,
    );

    await user.click(await findGridCell('Alpha'));

    await waitFor(() => {
      expect(onSelectionChanged).toHaveBeenCalled();
    });
    const lastCall = onSelectionChanged.mock.calls.at(-1)?.[0] as Row[];
    expect(lastCall).toEqual([ROWS[0]]);
  });

  it('does not emit selections when selectionMode is none', async () => {
    const user = userEvent.setup();
    const onSelectionChanged = vi.fn();
    render(
      <AppDataGrid
        rowData={ROWS}
        columnDefs={COLUMNS}
        selectionMode="none"
        onSelectionChanged={onSelectionChanged}
      />,
    );

    await user.click(await findGridCell('Alpha'));

    expect(onSelectionChanged).not.toHaveBeenCalled();
  });

  it('shows pagination controls only when asked', async () => {
    // Asserted through the accessibility tree rather than a CSS class: AG Grid
    // always renders the paging panel and hides it, so what matters is whether
    // the controls are actually reachable.
    const { rerender } = render(<AppDataGrid rowData={ROWS} columnDefs={COLUMNS} />);
    await findGridCell('Alpha');
    expect(screen.queryByRole('button', { name: 'Next Page' })).not.toBeInTheDocument();

    rerender(<AppDataGrid rowData={ROWS} columnDefs={COLUMNS} pagination paginationPageSize={2} />);

    expect(await screen.findByRole('button', { name: 'Next Page' })).toBeInTheDocument();
  });

  it('applies a custom cell renderer from columnDefs', async () => {
    const columns: ColDef<Row>[] = [
      {
        field: 'name',
        headerName: 'Name',
        cellRenderer: (params: { value: string }) => <em>rendered:{params.value}</em>,
      },
    ];
    render(<AppDataGrid rowData={ROWS} columnDefs={columns} />);

    expect(await findGridCell('rendered:Alpha')).toBeInTheDocument();
  });

  it('exposes the grid to assistive tech with grid semantics', async () => {
    render(<AppDataGrid rowData={ROWS} columnDefs={COLUMNS} />);
    await findGridCell('Alpha');

    const grid = screen.getByRole('grid');
    expect(within(grid).getByText('Alpha')).toBeInTheDocument();
    // Headers and cells carry their own roles, which is what lets a screen
    // reader announce "Name, column 1" rather than reading a flat div soup.
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('gridcell').length).toBeGreaterThan(0);
  });
});
