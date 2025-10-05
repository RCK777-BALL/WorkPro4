import { type ReactNode, useEffect, useMemo, useState } from 'react';

export type Density = 'comfortable' | 'compact';

export interface ProTableColumn<T> {
  key: keyof T | string;
  header: string;
  accessor?: (row: T) => ReactNode;
  width?: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  sortKey?: string;
}

interface PaginationConfig {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

interface ProTableProps<T> {
  data: T[];
  columns: ProTableColumn<T>[];
  getRowId: (row: T) => string;
  loading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (ids: string[]) => void;
  rowActions?: (row: T) => ReactNode;
  stickyHeader?: boolean;
  onExportCsv?: () => void;
  onExportXlsx?: () => void;
  exportDisabled?: boolean;
  pagination?: PaginationConfig;
  sort?: { key: string; direction: 'asc' | 'desc' };
  onSortChange?: (sort: { key: string; direction: 'asc' | 'desc' }) => void;
}

export function ProTable<T>({
  data,
  columns,
  getRowId,
  loading,
  emptyState,
  onRowClick,
  onSelectionChange,
  rowActions,
  stickyHeader = true,
  onExportCsv,
  onExportXlsx,
  exportDisabled,
  pagination,
  sort,
  onSortChange,
}: ProTableProps<T>) {
  const [selected, setSelected] = useState<string[]>([]);
  const [density, setDensity] = useState<Density>('comfortable');
  const [visibleColumns, setVisibleColumns] = useState(() => new Set(columns.map((column) => column.key)));
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  const allSelected = selected.length > 0 && selected.length === data.length;

  const headerCellClass = density === 'compact' ? 'py-2 text-xs' : 'py-3 text-sm';
  const bodyCellClass = density === 'compact' ? 'py-2 text-xs' : 'py-3 text-sm';

  const handleToggleAll = () => {
    if (allSelected) {
      setSelected([]);
      onSelectionChange?.([]);
    } else {
      const ids = data.map((item) => getRowId(item));
      setSelected(ids);
      onSelectionChange?.(ids);
    }
  };

  const handleToggleRow = (row: T) => {
    const id = getRowId(row);
    setSelected((current) => {
      const exists = current.includes(id);
      const next = exists ? current.filter((item) => item !== id) : [...current, id];
      onSelectionChange?.(next);
      return next;
    });
  };

  const columnList = useMemo(() => columns.filter((column) => visibleColumns.has(column.key)), [columns, visibleColumns]);

  useEffect(() => {
    setSelected([]);
    onSelectionChange?.([]);
  }, [data, onSelectionChange]);

  if (loading) {
    return (
      <div className="space-y-3 rounded-3xl border border-border bg-surface p-6 shadow-xl">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-10 w-full animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-xl">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 rounded-full border border-border bg-white/80 p-1 text-xs font-semibold">
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${density === 'comfortable' ? 'bg-brand text-white shadow' : 'text-mutedfg'}`}
            onClick={() => setDensity('comfortable')}
            data-testid="pro-table-density-comfortable"
          >
            Comfortable
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${density === 'compact' ? 'bg-brand text-white shadow' : 'text-mutedfg'}`}
            onClick={() => setDensity('compact')}
            data-testid="pro-table-density-compact"
          >
            Compact
          </button>
        </div>
        <div className="relative">
          <button
            type="button"
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-fg hover:bg-muted"
            onClick={() => setShowColumnMenu((prev) => !prev)}
            data-testid="pro-table-column-toggle"
          >
            Columns
          </button>
          {showColumnMenu && (
            <div className="absolute left-0 z-10 mt-2 w-48 rounded-2xl border border-border bg-bg p-3 text-sm shadow-xl">
              {columns.map((column) => {
                const active = visibleColumns.has(column.key);
                return (
                  <label key={String(column.key)} className="flex items-center justify-between gap-2 py-1 text-sm">
                    <span>{column.header}</span>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(event) => {
                        setVisibleColumns((current) => {
                          const next = new Set(current);
                          if (event.target.checked) {
                            next.add(column.key);
                          } else if (next.size > 1) {
                            next.delete(column.key);
                          }
                          return next;
                        });
                      }}
                      data-testid={`pro-table-column-${String(column.key)}-toggle`}
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {typeof onExportCsv === 'function' && (
            <button
              type="button"
              onClick={onExportCsv}
              disabled={exportDisabled}
              className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-fg hover:bg-muted disabled:opacity-60"
              data-testid="pro-table-export-csv"
            >
              Export CSV
            </button>
          )}
          {typeof onExportXlsx === 'function' && (
            <button
              type="button"
              onClick={onExportXlsx}
              disabled={exportDisabled}
              className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-fg hover:bg-muted disabled:opacity-60"
              data-testid="pro-table-export-xlsx"
            >
              Export XLSX
            </button>
          )}
          {rowActions && <div className="text-xs font-semibold text-mutedfg" data-testid="pro-table-selection-count">{selected.length} selected</div>}
        </div>
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-0 text-left">
          <thead className={stickyHeader ? 'sticky top-0 z-10 bg-bg shadow' : ''}>
            <tr>
              <th className={`${headerCellClass} sticky left-0 z-20 w-12 border-b border-border bg-bg px-4 text-left`}>
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={handleToggleAll}
                  data-testid="pro-table-select-all"
                />
              </th>
              {columnList.map((column) => {
                const sortable = Boolean(column.sortable && onSortChange);
                const sortKey = column.sortKey ?? String(column.key);
                const isSorted = sortable && sort?.key === sortKey;
                const nextDirection = isSorted && sort?.direction === 'asc' ? 'desc' : 'asc';
                const ariaSort = isSorted ? (sort?.direction === 'asc' ? 'ascending' : 'descending') : 'none';

                const handleSort = () => {
                  if (!sortable) {
                    return;
                  }
                  onSortChange?.({ key: sortKey, direction: nextDirection });
                };

                return (
                  <th
                    key={String(column.key)}
                    className={`${headerCellClass} border-b border-border bg-bg px-4 text-left font-semibold text-mutedfg`}
                    style={{ width: column.width }}
                    aria-sort={ariaSort}
                    scope="col"
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={handleSort}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition ${
                          isSorted ? 'bg-brand/10 text-brand' : 'text-mutedfg hover:bg-muted hover:text-fg'
                        }`}
                        data-testid={`pro-table-sort-${sortKey}`}
                      >
                        <span>{column.header}</span>
                        <span aria-hidden="true" className="text-[10px] leading-none">
                          {isSorted ? (sort?.direction === 'asc' ? '▲' : '▼') : '↕'}
                        </span>
                        <span className="sr-only">
                          Sort by {column.header}{' '}
                          {isSorted ? (sort?.direction === 'asc' ? 'descending' : 'ascending') : 'ascending'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {rowActions && <th className={`${headerCellClass} border-b border-border bg-bg px-4 text-right text-mutedfg`}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const id = getRowId(row);
              const isSelected = selected.includes(id);
              return (
                <tr
                  key={id}
                  className={`group border-b border-border/60 last:border-b-0 ${onRowClick ? 'cursor-pointer hover:bg-muted/60' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  <td className={`${bodyCellClass} sticky left-0 z-10 border-b border-border bg-bg px-4`}>
                    <input
                      type="checkbox"
                      aria-label={`Select row ${id}`}
                      checked={isSelected}
                      onChange={(event) => {
                        event.stopPropagation();
                        handleToggleRow(row);
                      }}
                      data-testid={`pro-table-row-select-${id}`}
                    />
                  </td>
                  {columnList.map((column) => {
                    const fallbackValue = (row as Record<string, unknown>)[column.key as string];
                    let cellValue: ReactNode;

                    if (column.accessor) {
                      cellValue = column.accessor(row);
                    } else if (typeof fallbackValue === 'string' || typeof fallbackValue === 'number') {
                      cellValue = fallbackValue;
                    } else if (typeof fallbackValue === 'boolean') {
                      cellValue = fallbackValue ? 'Yes' : 'No';
                    } else {
                      cellValue = null;
                    }

                    return (
                      <td
                        key={String(column.key)}
                        className={`${bodyCellClass} border-b border-border px-4 text-fg transition group-hover:border-brand/30 ${
                          column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''
                        }`}
                      >
                        {cellValue}
                      </td>
                    );
                  })}
                  {rowActions && (
                    <td className={`${bodyCellClass} border-b border-border px-4 text-right`}>{rowActions(row)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg px-5 py-4 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="rounded-xl border border-border px-3 py-2 font-semibold text-fg hover:bg-muted disabled:opacity-60"
              data-testid="pro-table-page-prev"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-xl border border-border px-3 py-2 font-semibold text-fg hover:bg-muted disabled:opacity-60"
              data-testid="pro-table-page-next"
            >
              Next
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span data-testid="pro-table-page-info">
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)} • {pagination.totalItems} records
            </span>
            {pagination.onPageSizeChange && (
              <select
                value={pagination.pageSize}
                onChange={(event) => pagination.onPageSizeChange?.(Number(event.target.value))}
                className="rounded-xl border border-border px-2 py-1 text-xs"
                data-testid="pro-table-page-size"
              >
                {(pagination.pageSizeOptions ?? [10, 20, 50]).map((option) => (
                  <option key={option} value={option}>
                    {option} / page
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
