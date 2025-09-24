import { Building, Mail, Phone } from 'lucide-react';

const vendors = [
  { name: 'Northside HVAC', contact: 'Sasha Fields', email: 'sasha@northsidehvac.com', phone: '+1 555-774-8821', status: 'Active' },
  { name: 'Precision Pumps', contact: 'Devon Li', email: 'devon@precisionpumps.com', phone: '+1 555-443-2218', status: 'Preferred' },
  { name: 'Atlas Safety', contact: 'Carmen Ortiz', email: 'carmen@atlassafety.com', phone: '+1 555-998-3344', status: 'Under review' }
];

export default function Vendors() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-fg">Vendors</h1>
        <p className="mt-2 text-sm text-mutedfg">Keep supplier details, compliance status, and contact info centralized.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vendors.map((vendor) => (
          <article key={vendor.name} className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-brand/10 p-3 text-brand">
                <Building className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-fg">{vendor.name}</p>
                <p className="text-xs uppercase tracking-wide text-mutedfg">{vendor.status}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-mutedfg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a className="text-fg hover:underline" href={`mailto:${vendor.email}`}>
                  {vendor.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <a className="text-fg hover:underline" href={`tel:${vendor.phone}`}>
                  {vendor.phone}
                </a>
              </div>
            </div>
            <p className="mt-4 text-sm text-mutedfg">Primary contact: {vendor.contact}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
