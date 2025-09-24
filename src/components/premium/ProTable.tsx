import { type ReactNode, useMemo, useState } from 'react';

export type Density = 'comfortable' | 'compact';

export interface ProTableColumn<T> {
  key: keyof T | string;
  header: string;
  accessor?: (row: T) => ReactNode;
  width?: string;
  align?: 'left' | 'right' | 'center';
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
}

export function ProTable<T>({ data, columns, getRowId, loading, emptyState, onRowClick, onSelectionChange, rowActions, stickyHeader = true }: ProTableProps<T>) {
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

  const handleExport = () => {
    const header = ['"id"', ...columnList.map((column) => `"${String(column.header)}"`)].join(',');
    const rows = data.map((row) => {
      const values = columnList.map((column) => {
        const value = column.accessor ? column.accessor(row) : (row as Record<string, unknown>)[column.key as string];
        if (typeof value === 'string' || typeof value === 'number') {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
        return '""';
      });
      return [`"${getRowId(row)}"`, ...values].join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'workpro-export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          >
            Comfortable
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${density === 'compact' ? 'bg-brand text-white shadow' : 'text-mutedfg'}`}
            onClick={() => setDensity('compact')}
          >
            Compact
          </button>
        </div>
        <div className="relative">
          <button
            type="button"
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-fg hover:bg-muted"
            onClick={() => setShowColumnMenu((prev) => !prev)}
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
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-fg hover:bg-muted"
        >
          Export CSV
        </button>
        {rowActions && <div className="ml-auto text-xs font-semibold text-mutedfg">{selected.length} selected</div>}
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
                />
              </th>
              {columnList.map((column) => (
                <th
                  key={String(column.key)}
                  className={`${headerCellClass} border-b border-border bg-bg px-4 text-left font-semibold text-mutedfg`}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
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
                    />
                  </td>
                  {columnList.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`${bodyCellClass} border-b border-border px-4 text-fg transition group-hover:border-brand/30 ${
                        column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''
                      }`}
                    >
                      {column.accessor ? column.accessor(row) : (row as Record<string, unknown>)[column.key as string]}
                    </td>
                  ))}
                  {rowActions && (
                    <td className={`${bodyCellClass} border-b border-border px-4 text-right`}>{rowActions(row)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
