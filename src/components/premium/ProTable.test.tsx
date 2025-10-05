import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { ProTable, type ProTableColumn } from './ProTable';

interface Row {
  id: string;
  name: string;
}

const columns: ProTableColumn<Row>[] = [{ key: 'name', header: 'Name' }];

describe('ProTable', () => {
  afterEach(() => {
    cleanup();
  });

  it('exposes export callbacks via data-testids', () => {
    const onExportCsv = vi.fn();
    const onExportXlsx = vi.fn();

    render(
      <ProTable
        data={[{ id: '1', name: 'Alpha' }]}
        columns={columns}
        getRowId={(row) => row.id}
        onExportCsv={onExportCsv}
        onExportXlsx={onExportXlsx}
        pagination={{
          page: 1,
          pageSize: 10,
          totalPages: 1,
          totalItems: 1,
          onPageChange: vi.fn(),
        }}
      />,
    );

    fireEvent.click(screen.getByTestId('pro-table-export-csv'));
    fireEvent.click(screen.getByTestId('pro-table-export-xlsx'));

    expect(onExportCsv).toHaveBeenCalledTimes(1);
    expect(onExportXlsx).toHaveBeenCalledTimes(1);
  });

  it('emits selection changes through checkboxes', () => {
    const onSelectionChange = vi.fn();

    render(
      <ProTable
        data={[{ id: '1', name: 'Alpha' }]}
        columns={columns}
        getRowId={(row) => row.id}
        onSelectionChange={onSelectionChange}
      />, 
    );

    fireEvent.click(screen.getByTestId('pro-table-row-select-1'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['1']);

    fireEvent.click(screen.getByTestId('pro-table-select-all'));
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it('emits sort changes when sortable headers are clicked', () => {
    const onSortChange = vi.fn();

    render(
      <ProTable
        data={[{ id: '1', name: 'Alpha' }]}
        columns={[{ key: 'name', header: 'Name', sortable: true }]}
        getRowId={(row) => row.id}
        sort={{ key: 'name', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    );

    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.click(screen.getByTestId('pro-table-sort-name'));

    expect(onSortChange).toHaveBeenCalledWith({ key: 'name', direction: 'desc' });
  });
});

