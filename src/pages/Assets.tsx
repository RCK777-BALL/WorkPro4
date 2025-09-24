import { useMemo, useState } from 'react';
import { Building2, Filter, LayoutGrid, List, MapPin, Plus, Search, SlidersHorizontal, Wrench } from 'lucide-react';
import { DataBadge } from '../components/premium/DataBadge';
import { SlideOver } from '../components/premium/SlideOver';
import { ProTable, type ProTableColumn } from '../components/premium/ProTable';
import { FilterBar, type FilterDefinition } from '../components/premium/FilterBar';

interface AssetRecord {
  id: string;
  name: string;
  code: string;
  status: 'Operational' | 'Maintenance' | 'Down';
  site: string;
  area: string;
  owner: string;
  criticality: 'Low' | 'Medium' | 'High';
  nextService: string;
}

const columns: ProTableColumn<AssetRecord>[] = [
  { key: 'code', header: 'Tag' },
  { key: 'name', header: 'Asset' },
  { key: 'site', header: 'Site' },
  { key: 'area', header: 'Area' },
  { key: 'owner', header: 'Owner' },
  { key: 'criticality', header: 'Criticality', accessor: (row) => <DataBadge status={row.criticality} /> },
  { key: 'status', header: 'Status', accessor: (row) => <DataBadge status={row.status} /> },
  { key: 'nextService', header: 'Next service' }
];

const filters: FilterDefinition[] = [
  { key: 'site', label: 'Site', type: 'select', options: ['Plant 1', 'Plant 2', 'Corporate HQ'].map((value) => ({ value, label: value })) },
  { key: 'status', label: 'Status', type: 'select', options: ['Operational', 'Maintenance', 'Down'].map((value) => ({ value, label: value })) },
  { key: 'criticality', label: 'Criticality', type: 'select', options: ['Low', 'Medium', 'High'].map((value) => ({ value, label: value })) },
  { key: 'owner', label: 'Owner', type: 'text', placeholder: 'Team or technician' }
];

const assets: AssetRecord[] = [
  { id: '1', code: 'PUMP-001', name: 'Main Water Pump', status: 'Operational', site: 'Plant 1', area: 'Mechanical', owner: 'Utilities', criticality: 'High', nextService: '2024-06-17' },
  { id: '2', code: 'CONV-204', name: 'Line 2 Conveyor', status: 'Maintenance', site: 'Plant 1', area: 'Production', owner: 'Line 2', criticality: 'High', nextService: 'In progress' },
  { id: '3', code: 'HVAC-18', name: 'Roof HVAC Unit', status: 'Down', site: 'Plant 2', area: 'Roof', owner: 'Facilities', criticality: 'Medium', nextService: 'Overdue' },
  { id: '4', code: 'COMP-06', name: 'Air Compressor', status: 'Operational', site: 'Plant 2', area: 'Utilities', owner: 'Utilities', criticality: 'High', nextService: '2024-07-04' },
  { id: '5', code: 'GEN-11', name: 'Backup Generator', status: 'Operational', site: 'Corporate HQ', area: 'Basement', owner: 'Facilities', criticality: 'High', nextService: '2024-06-30' }
];

const tree = [
  {
    label: 'Plant 1',
    count: 124,
    children: [
      { label: 'Production', count: 68 },
      { label: 'Utilities', count: 32 },
      { label: 'Packaging', count: 24 }
    ]
  },
  {
    label: 'Plant 2',
    count: 72,
    children: [
      { label: 'Production', count: 40 },
      { label: 'Utilities', count: 20 },
      { label: 'Warehouse', count: 12 }
    ]
  },
  {
    label: 'Corporate HQ',
    count: 38,
    children: [
      { label: 'Facilities', count: 18 },
      { label: 'Security', count: 6 },
      { label: 'IT Infrastructure', count: 14 }
    ]
  }
];

export default function Assets() {
  const [values, setValues] = useState<Record<string, string>>({ search: '' });
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [showDrawer, setShowDrawer] = useState(false);
  const [draft, setDraft] = useState<AssetRecord>({
    id: '',
    code: '',
    name: '',
    status: 'Operational',
    site: '',
    area: '',
    owner: '',
    criticality: 'Medium',
    nextService: ''
  });

  const filtered = useMemo(() => {
    const search = (values.search ?? '').toLowerCase();
    return assets.filter((asset) => {
      const matchesSearch = search
        ? [asset.name, asset.code, asset.owner, asset.area].some((field) => field.toLowerCase().includes(search))
        : true;
      const matchesSite = values.site ? asset.site === values.site : true;
      const matchesStatus = values.status ? asset.status === values.status : true;
      const matchesCriticality = values.criticality ? asset.criticality === values.criticality : true;
      const matchesOwner = values.owner ? asset.owner.toLowerCase().includes(values.owner.toLowerCase()) : true;
      return matchesSearch && matchesSite && matchesStatus && matchesCriticality && matchesOwner;
    });
  }, [values]);

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <aside className="space-y-6 rounded-3xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-brand" />
          <div>
            <h2 className="text-lg font-semibold text-fg">Asset catalog</h2>
            <p className="text-sm text-mutedfg">Explore locations, tags, and hierarchies.</p>
          </div>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-mutedfg" />
          <input
            value={values.search ?? ''}
            onChange={(event) => setValues((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Search assets"
            className="w-full rounded-2xl border border-border bg-white px-10 py-3 text-sm text-fg shadow-inner outline-none transition focus:ring-2 focus:ring-brand"
          />
        </div>
        <button className="w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <SlidersHorizontal className="mr-2 inline h-4 w-4" /> Saved views
        </button>
        <div className="space-y-4">
          {tree.map((node) => (
            <div key={node.label}>
              <div className="flex items-center justify-between text-sm font-semibold text-fg">
                <span>{node.label}</span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-mutedfg">{node.count}</span>
              </div>
              <ul className="mt-3 space-y-2 pl-3 text-sm text-mutedfg">
                {node.children.map((child) => (
                  <li key={child.label} className="flex items-center justify-between">
                    <span>{child.label}</span>
                    <span>{child.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
      <section className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-fg">Assets</h1>
            <p className="mt-2 text-sm text-mutedfg">Monitor lifecycle state, compliance, and criticality for every asset.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-border bg-white/70 p-1 text-xs font-semibold text-mutedfg shadow-inner">
              <button
                type="button"
                className={`flex items-center gap-2 rounded-full px-4 py-1 ${view === 'table' ? 'bg-brand text-white shadow' : ''}`}
                onClick={() => setView('table')}
              >
                <List className="h-4 w-4" /> Table
              </button>
              <button
                type="button"
                className={`flex items-center gap-2 rounded-full px-4 py-1 ${view === 'cards' ? 'bg-brand text-white shadow' : ''}`}
                onClick={() => setView('cards')}
              >
                <LayoutGrid className="h-4 w-4" /> Cards
              </button>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Filter className="h-4 w-4" /> Advanced filters
            </button>
            <button
              onClick={() => {
                setDraft({
                  id: `AST-${Date.now()}`,
                  code: '',
                  name: '',
                  status: 'Operational',
                  site: '',
                  area: '',
                  owner: '',
                  criticality: 'Medium',
                  nextService: ''
                });
                setShowDrawer(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <Plus className="h-4 w-4" /> Quick add asset
            </button>
          </div>
        </header>
        <FilterBar filters={filters} values={values} onChange={(key, value) => setValues((prev) => ({ ...prev, [key]: value }))} sticky={false} />
        {view === 'table' ? (
          <ProTable
            data={filtered}
            columns={columns}
            getRowId={(row) => row.id}
            onRowClick={(row) => {
              setDraft(row);
              setShowDrawer(true);
            }}
            rowActions={(row) => (
              <button type="button" className="rounded-full border border-border px-3 py-1 text-xs text-brand" onClick={(event) => {
                event.stopPropagation();
                setDraft(row);
                setShowDrawer(true);
              }}>
                Inspect
              </button>
            )}
            emptyState={<div className="rounded-3xl border border-border bg-surface p-10 text-center text-sm text-mutedfg">No assets match your filters.</div>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((asset) => (
              <article key={asset.id} className="rounded-3xl border border-border bg-surface p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
                <div className="flex items-start justify-between">
                  <div className="rounded-2xl bg-brand/10 p-3 text-brand">
                    <Wrench className="h-6 w-6" />
                  </div>
                  <DataBadge status={asset.status} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-fg">{asset.name}</h3>
                <p className="text-sm text-mutedfg">{asset.code}</p>
                <div className="mt-4 space-y-2 text-sm text-mutedfg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{asset.site} · {asset.area}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Owner: {asset.owner}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    <span>Criticality: {asset.criticality}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted/70 px-4 py-3 text-sm text-mutedfg">
                  <span>Next service</span>
                  <span className="font-semibold text-fg">{asset.nextService}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <SlideOver
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        title={draft.name ? `Edit ${draft.name}` : 'Register asset'}
        description="Capture essential meta data to keep your asset registry synchronized."
      >
        <form className="space-y-5">
          <label className="block text-sm font-semibold text-mutedfg">
            Asset name
            <input
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Asset tag
            <input
              value={draft.code}
              onChange={(event) => setDraft((prev) => ({ ...prev, code: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-mutedfg">
              Site
              <input
                value={draft.site}
                onChange={(event) => setDraft((prev) => ({ ...prev, site: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
            <label className="block text-sm font-semibold text-mutedfg">
              Area
              <input
                value={draft.area}
                onChange={(event) => setDraft((prev) => ({ ...prev, area: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold text-mutedfg">
            Owner
            <input
              value={draft.owner}
              onChange={(event) => setDraft((prev) => ({ ...prev, owner: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-mutedfg">
              Status
              <select
                value={draft.status}
                onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as AssetRecord['status'] }))}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {['Operational', 'Maintenance', 'Down'].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-mutedfg">
              Criticality
              <select
                value={draft.criticality}
                onChange={(event) => setDraft((prev) => ({ ...prev, criticality: event.target.value as AssetRecord['criticality'] }))}
                className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              >
                {['Low', 'Medium', 'High'].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-mutedfg">
            Next service
            <input
              type="date"
              value={draft.nextService}
              onChange={(event) => setDraft((prev) => ({ ...prev, nextService: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowDrawer(false)} className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg">
              Cancel
            </button>
            <button type="button" onClick={() => setShowDrawer(false)} className="rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg">
              Save asset
            </button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
