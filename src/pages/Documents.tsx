import { File, FilePlus, Upload } from 'lucide-react';

const docs = [
  { name: 'Lockout procedure - Line 2.pdf', updated: 'Today at 10:21', size: '2.4 MB' },
  { name: 'HVAC compliance checklist.xlsx', updated: 'Yesterday', size: '812 KB' },
  { name: 'Vendor contract - Northside HVAC.pdf', updated: 'May 1', size: '1.2 MB' }
];

export default function Documents() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-fg">Documents</h1>
          <p className="mt-2 text-sm text-mutedfg">Store SOPs, safety manuals, and vendor agreements with role-based access control.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg">
          <FilePlus className="h-4 w-4" /> Upload document
        </button>
      </header>
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
        <div className="grid gap-3">
          {docs.map((doc) => (
            <div key={doc.name} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3 text-sm text-mutedfg">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-brand/10 p-2 text-brand"><File className="h-4 w-4" /></span>
                <div>
                  <p className="font-semibold text-fg">{doc.name}</p>
                  <p>Updated {doc.updated} • {doc.size}</p>
                </div>
              </div>
              <button className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand">Share</button>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-dashed border-border bg-muted/40 p-10 text-sm text-mutedfg">
        <div className="flex items-start gap-3">
          <Upload className="h-5 w-5 text-brand" />
          <div>
            <p className="font-semibold text-fg">Bulk import coming soon</p>
            <p className="mt-1">Drag-and-drop upload with auto-tagging and version history will land in Q3.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
