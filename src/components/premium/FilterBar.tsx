import { type ReactNode } from 'react';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterDefinition {
  key: string;
  label: string;
  placeholder?: string;
  type: 'search' | 'select' | 'date' | 'text';
  options?: FilterOption[];
  icon?: ReactNode;
  testId?: string;
}

export interface QuickFilter {
  key: string;
  value: string;
  label: string;
}

interface FilterBarProps {
  filters: FilterDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset?: () => void;
  quickFilters?: QuickFilter[];
  actions?: ReactNode;
  sticky?: boolean;
}

export function FilterBar({ filters, values, onChange, onReset, quickFilters = [], actions, sticky = true }: FilterBarProps) {
  return (
    <section
      className={`z-30 mb-6 rounded-3xl border border-border bg-surface/95 px-5 py-4 shadow-xl ${sticky ? 'sticky top-20 backdrop-blur' : ''}`}
      aria-label="Filters"
    >
      <div className="flex flex-wrap items-center gap-3">
        {filters.map((filter) => (
          <label key={filter.key} className="flex flex-col gap-2 text-xs font-medium text-mutedfg">
            <span>{filter.label}</span>
            {filter.type === 'select' ? (
              <select
                className="min-w-[150px] rounded-xl border border-border bg-white/80 px-3 py-2 text-sm text-fg shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:bg-muted"
                value={values[filter.key] ?? ''}
                onChange={(event) => onChange(filter.key, event.target.value)}
                data-testid={filter.testId}
              >
                <option value="">Any</option>
                {(filter.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : filter.type === 'date' ? (
              <input
                type="date"
                className="rounded-xl border border-border bg-white/80 px-3 py-2 text-sm text-fg shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:bg-muted"
                value={values[filter.key] ?? ''}
                onChange={(event) => onChange(filter.key, event.target.value)}
                data-testid={filter.testId}
              />
            ) : (
              <input
                type={filter.type === 'search' ? 'search' : 'text'}
                placeholder={filter.placeholder}
                className="min-w-[220px] rounded-xl border border-border bg-white/80 px-3 py-2 text-sm text-fg shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:bg-muted"
                value={values[filter.key] ?? ''}
                onChange={(event) => onChange(filter.key, event.target.value)}
                data-testid={filter.testId}
              />
            )}
          </label>
        ))}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
      {quickFilters.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-mutedfg">Quick Filters</span>
          {quickFilters.map((filter) => {
            const active = values[filter.key] === filter.value;
            return (
              <button
                key={`${filter.key}-${filter.value}`}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active ? 'border-transparent bg-brand text-white shadow-lg' : 'border-border bg-white/80 text-fg hover:bg-muted'
                }`}
                onClick={() => onChange(filter.key, active ? '' : filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            );
          })}
          {onReset && (
            <button
              type="button"
              onClick={() => onReset()}
              className="ml-2 text-xs font-semibold uppercase tracking-wide text-mutedfg underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </section>
  );
}
