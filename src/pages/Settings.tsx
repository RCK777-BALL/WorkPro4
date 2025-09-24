import { useState } from 'react';
import { Banknote, Building2, Copy, CreditCard, Globe, KeyRound, Lock, Mail, ShieldCheck, User, Zap } from 'lucide-react';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'api', label: 'API Keys', icon: KeyRound }
] as const;

const tokens = [
  { id: 'server', label: 'Server token', value: 'srv_6b2f4b1d-2019-4aa4-9d11-0ef2e2f0a7bd', scope: 'Full access' },
  { id: 'client', label: 'Client token', value: 'cli_a0bbf5fe-6715-4dfb-baad-770acb2bc91d', scope: 'Read only' }
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('profile');
  const [copyState, setCopyState] = useState<string | null>(null);

  const handleCopy = (value: string, id: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopyState(id);
        window.setTimeout(() => setCopyState(null), 1500);
      })
      .catch(() => {
        setCopyState(null);
      });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-mutedfg">Control center</p>
          <h1 className="mt-2 text-3xl font-semibold text-fg">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-mutedfg">
            Configure WorkPro for your organization. Manage security, billing, integrations, and API credentials in one place.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-surface px-5 py-3 text-xs font-semibold uppercase tracking-wide text-mutedfg shadow-xl">
          <ShieldCheck className="h-4 w-4 text-success" /> SOC 2 Type II certified
        </div>
      </header>
      <nav className="flex flex-wrap items-center gap-2 rounded-3xl border border-border bg-surface p-2 shadow-xl" aria-label="Settings tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-brand text-white shadow-lg' : 'text-mutedfg hover:bg-muted'
              }`}
              onClick={() => setActiveTab(tab.id)}
              aria-current={active}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-fg">Profile</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Full name
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="Jordan Daniels" />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Email
                <input type="email" className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="jordan@workpro.io" />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Job title
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="Operations Admin" />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Phone
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="+1 555 123 7744" />
              </label>
            </div>
            <div className="rounded-2xl border border-border bg-white/60 px-4 py-3 text-sm text-mutedfg dark:bg-muted/60">
              <Lock className="mr-2 inline h-4 w-4 text-brand" />
              Password is protected via SSO. Manage access via your identity provider.
            </div>
            <button className="rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg">Save changes</button>
          </div>
        )}
        {activeTab === 'organization' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-fg">Organization</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <label className="block text-sm font-semibold text-mutedfg">
                Organization name
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="Northwind Manufacturing" />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Industry
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="Industrial Manufacturing" />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Time zone
                <select className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand">
                  <option>GMT-06:00 — Central Time</option>
                  <option>GMT-05:00 — Eastern Time</option>
                  <option>GMT-08:00 — Pacific Time</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Domain
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="maintenance.northwind.com" />
              </label>
            </div>
            <div className="rounded-2xl border border-border bg-muted/50 px-4 py-4 text-sm text-mutedfg">
              <p className="font-semibold text-fg">Team invitations</p>
              <p className="mt-1">Send invites to <span className="font-semibold text-fg">techteam@northwind.com</span>. Invites expire after 7 days.</p>
            </div>
          </div>
        )}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-fg">Billing</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-white/70 p-4 shadow-inner dark:bg-muted/70">
                <p className="text-xs font-semibold uppercase tracking-wide text-mutedfg">Current plan</p>
                <p className="mt-2 text-lg font-semibold text-fg">Scale - $1,000/mo</p>
                <p className="mt-1 text-sm text-mutedfg">Includes 50 technicians, priority support, and predictive analytics.</p>
              </div>
              <label className="block text-sm font-semibold text-mutedfg">
                Billing email
                <input type="email" className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" defaultValue="finance@northwind.com" />
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Payment method
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-fg shadow-inner">
                  <CreditCard className="h-4 w-4 text-brand" />
                  Visa ending in 4421 — Expires 08/27
                </div>
              </label>
              <label className="block text-sm font-semibold text-mutedfg">
                Purchase order
                <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" placeholder="Optional" />
              </label>
            </div>
            <button className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg">Download invoices</button>
          </div>
        )}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-fg">Integrations</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {[{ label: 'SAP PM', status: 'Connected' }, { label: 'Power BI', status: 'Connected' }, { label: 'ServiceNow', status: 'Ready to connect' }, { label: 'Azure AD', status: 'Syncing' }].map((integration) => (
                <div key={integration.label} className="rounded-2xl border border-border bg-white/70 p-4 shadow-inner dark:bg-muted/70">
                  <p className="text-sm font-semibold text-fg">{integration.label}</p>
                  <p className="text-xs text-mutedfg">Status: {integration.status}</p>
                  <button className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand">
                    Manage <Banknote className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-fg">API Keys</h2>
            <p className="text-sm text-mutedfg">Rotate keys regularly and scope them to the minimum required permissions.</p>
            <div className="space-y-4">
              {tokens.map((token) => (
                <div key={token.id} className="rounded-2xl border border-border bg-white/70 p-4 shadow-inner dark:bg-muted/70">
                  <p className="text-sm font-semibold text-fg">{token.label}</p>
                  <p className="text-xs text-mutedfg">Scope: {token.scope}</p>
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-2 text-sm text-mutedfg shadow-inner">
                    <input readOnly value={token.value} className="flex-1 bg-transparent text-sm text-fg outline-none" />
                    <button
                      type="button"
                      onClick={() => handleCopy(token.value, token.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-brand"
                    >
                      <Copy className="h-3 w-3" />
                      {copyState === token.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg">Generate new key</button>
          </div>
        )}
      </section>
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-fg">Security checklist</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[{ label: 'SSO Enforced', status: 'Enabled', icon: ShieldCheck }, { label: 'SCIM Provisioning', status: 'Enabled', icon: Zap }, { label: 'Weekly audit log digest', status: 'Email', icon: Mail }, { label: 'Backups', status: 'Nightly', icon: Banknote }].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-border bg-white/70 px-4 py-3 text-sm text-mutedfg shadow-inner dark:bg-muted/70">
                <Icon className="h-5 w-5 text-brand" />
                <div>
                  <p className="font-semibold text-fg">{item.label}</p>
                  <p>{item.status}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
