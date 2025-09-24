import { useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, Mail, Phone, Plus, Search, Shield, User, Users } from 'lucide-react';
import { DataBadge } from '../components/premium/DataBadge';
import { SlideOver } from '../components/premium/SlideOver';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: 'Available' | 'Busy' | 'On Leave';
  tags: string[];
}

const orgTree = [
  {
    label: 'Operations',
    description: 'Maintenance leadership and planners',
    members: 8,
    children: [
      { label: 'Reliability Engineering', members: 3 },
      { label: 'Maintenance Planning', members: 2 },
      { label: 'Facilities', members: 3 }
    ]
  },
  {
    label: 'Field Technicians',
    description: 'Electro-mechanical workforce',
    members: 12,
    children: [
      { label: 'Electrical', members: 5 },
      { label: 'Mechanical', members: 4 },
      { label: 'HVAC / Utilities', members: 3 }
    ]
  }
];

const members: TeamMember[] = [
  { id: '1', name: 'Jordan Daniels', role: 'Maintenance Planner', email: 'jordan@workpro.io', phone: '+1 555-123-8899', status: 'Available', tags: ['Planning', 'SAP', 'Compliance'] },
  { id: '2', name: 'Maya Rivera', role: 'Reliability Engineer', email: 'maya@workpro.io', phone: '+1 555-678-4433', status: 'Busy', tags: ['Vibration', 'Thermography'] },
  { id: '3', name: 'Andre Chen', role: 'Lead Technician', email: 'andre@workpro.io', phone: '+1 555-789-2233', status: 'Available', tags: ['Electrical', 'PLC'] },
  { id: '4', name: 'Sophie Blake', role: 'Facilities Manager', email: 'sophie@workpro.io', phone: '+1 555-882-4411', status: 'On Leave', tags: ['Facilities', 'HVAC'] },
  { id: '5', name: 'Darius Patel', role: 'Mechanical Technician', email: 'darius@workpro.io', phone: '+1 555-441-9090', status: 'Busy', tags: ['Hydraulics', 'Rigging'] }
];

export default function Teams() {
  const [search, setSearch] = useState('');
  const [openInvite, setOpenInvite] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const filteredMembers = useMemo(() => {
    const term = search.toLowerCase();
    return members.filter((member) =>
      [member.name, member.role, member.email, ...member.tags].some((value) => value.toLowerCase().includes(term))
    );
  }, [search]);

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="space-y-6 rounded-3xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-brand/10 p-3 text-brand">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-fg">Org structure</h2>
            <p className="text-sm text-mutedfg">Navigate crews, roles, and reporting lines.</p>
          </div>
        </div>
        <div className="space-y-4">
          {orgTree.map((node) => (
            <div key={node.label} className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm dark:bg-muted/70">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-fg">{node.label}</p>
                  <p className="text-xs text-mutedfg">{node.description}</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-mutedfg">{node.members}</span>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-mutedfg">
                {node.children.map((child) => (
                  <li key={child.label}>
                    <button
                      type="button"
                      onClick={() => setSelectedTeam(child.label)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                        selectedTeam === child.label ? 'bg-brand/10 text-brand' : 'hover:bg-muted'
                      }`}
                    >
                      <span>{child.label}</span>
                      <span>{child.members}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <button
          onClick={() => setOpenInvite(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-2 text-sm font-semibold text-fg shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <Plus className="h-4 w-4" /> Invite teammate
        </button>
      </aside>
      <section className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-fg">Teams</h1>
            <p className="mt-2 text-sm text-mutedfg">
              Orchestrate technicians, planners, and managers with clear visibility into capacity and expertise.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg shadow-sm">
            <Shield className="h-4 w-4" /> Manage roles
          </button>
        </header>
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-xl">
          <Search className="h-4 w-4 text-mutedfg" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members, skills, or roles"
            className="flex-1 bg-transparent text-sm text-fg outline-none"
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-mutedfg">{filteredMembers.length} people</span>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredMembers.map((member) => (
            <article key={member.id} className="rounded-3xl border border-border bg-surface p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-fg">{member.name}</p>
                    <p className="text-sm text-mutedfg">{member.role}</p>
                  </div>
                </div>
                <DataBadge status={member.status} />
              </div>
              <div className="mt-4 space-y-2 text-sm text-mutedfg">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a className="text-fg hover:underline" href={`mailto:${member.email}`}>
                    {member.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a className="text-fg hover:underline" href={`tel:${member.phone}`}>
                    {member.phone}
                  </a>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-mutedfg">Skill tags</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {member.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-mutedfg">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between rounded-2xl bg-muted/60 px-4 py-3 text-xs text-mutedfg">
                <span>Last activity: 2h ago</span>
                <button className="inline-flex items-center gap-1 text-brand">
                  View schedule
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <SlideOver
        open={openInvite}
        onClose={() => setOpenInvite(false)}
        title="Invite a teammate"
        description="Send an email invitation with pre-configured role permissions."
      >
        <form className="space-y-5">
          <label className="block text-sm font-semibold text-mutedfg">
            Full name
            <input className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" />
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Email
            <input type="email" className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand" />
          </label>
          <label className="block text-sm font-semibold text-mutedfg">
            Role
            <select className="mt-2 w-full rounded-2xl border border-border bg-white px-4 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand">
              <option>Technician</option>
              <option>Planner</option>
              <option>Manager</option>
              <option>Viewer</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-mutedfg">
            <input type="checkbox" className="h-4 w-4 rounded border-border text-brand focus:ring-brand" defaultChecked />
            Send welcome playbook
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpenInvite(false)} className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-fg">
              Cancel
            </button>
            <button type="button" onClick={() => setOpenInvite(false)} className="rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg">
              Send invite
            </button>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white/60 px-4 py-3 text-xs text-mutedfg dark:bg-muted/60">
            <p className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-brand" />
              Invitations expire in 72 hours and enforce SSO if configured.
            </p>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
