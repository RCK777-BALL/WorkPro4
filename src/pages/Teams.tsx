import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Clock,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Shield,
  User,
  Users,
} from 'lucide-react';
import { DataBadge } from '../components/premium/DataBadge';
import { SlideOver } from '../components/premium/SlideOver';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import type {
  TeamsOverviewResponse,
  TeamMemberDto,
  TeamInvitationDto,
  ShiftDto,
  LaborEntryDto,
} from '../../shared/types/teams';

function formatDuration(minutes: number): string {
  const totalMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(totalMinutes / 60);
  const remainder = totalMinutes % 60;

  if (hours && remainder) {
    return `${hours}h ${remainder}m`;
  }

  if (hours) {
    return `${hours}h`;
  }

  return `${remainder}m`;
}

function formatDateInput(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 16);
}

function normalizeDateInput(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

const DEFAULT_SHIFT_FORM = {
  startsAt: '',
  endsAt: '',
  type: 'regular',
  notes: '',
};

const DEFAULT_LABOR_FORM = {
  workOrderId: '',
  startedAt: '',
  endedAt: '',
  notes: '',
};

const DEFAULT_INVITE_FORM = {
  email: '',
  role: 'technician',
  expiresAt: '',
  message: '',
};

type ShiftFormState = typeof DEFAULT_SHIFT_FORM;
type LaborFormState = typeof DEFAULT_LABOR_FORM;
type InviteFormState = typeof DEFAULT_INVITE_FORM;

type RoleSummary = {
  role: string;
  label: string;
  count: number;
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  planner: 'Planner',
  technician: 'Technician',
  viewer: 'Viewer',
  user: 'User',
};

export default function Teams() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState<ShiftFormState>(DEFAULT_SHIFT_FORM);
  const [laborForm, setLaborForm] = useState<LaborFormState>(DEFAULT_LABOR_FORM);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(DEFAULT_INVITE_FORM);
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [laborError, setLaborError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
  } = useQuery<TeamsOverviewResponse>({
    queryKey: ['teams-overview'],
    queryFn: () => api.get<TeamsOverviewResponse>('/teams'),
  });

  const members = data?.members ?? [];
  const invites = data?.invites ?? [];
  const canManageInvites = Boolean(data?.canManageInvites);

  const roleSummary: RoleSummary[] = useMemo(() => {
    const counts = members.reduce<Record<string, number>>((acc, member) => {
      const roleKey = member.role || 'user';
      acc[roleKey] = (acc[roleKey] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([role, count]) => ({
        role,
        label: ROLE_LABELS[role] ?? role,
        count,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [members]);

  const filteredMembers = useMemo(() => {
    const term = search.toLowerCase().trim();
    return members.filter((member) => {
      const matchesRole = selectedRole === 'all' || member.role === selectedRole;
      const matchesSearch =
        !term ||
        [
          member.name,
          member.role,
          member.email,
          member.phone ?? '',
          ...member.tags,
        ]
          .join(' ')
          .toLowerCase()
          .includes(term);
      return matchesRole && matchesSearch;
    });
  }, [members, search, selectedRole]);

  const selectedMember = useMemo<TeamMemberDto | null>(() => {
    if (!selectedMemberId) {
      return null;
    }
    return members.find((member) => member.id === selectedMemberId) ?? null;
  }, [selectedMemberId, members]);

  useEffect(() => {
    if (!selectedMember) {
      setShiftForm(DEFAULT_SHIFT_FORM);
      setLaborForm(DEFAULT_LABOR_FORM);
      setShiftError(null);
      setLaborError(null);
    } else {
      setShiftForm((previous) => ({
        ...previous,
        startsAt: '',
        endsAt: '',
        type: 'regular',
        notes: '',
      }));
      setLaborForm(DEFAULT_LABOR_FORM);
      setShiftError(null);
      setLaborError(null);
    }
  }, [selectedMember]);

  const createShift = useMutation({
    mutationFn: async (payload: {
      userId?: string;
      startsAt: string;
      endsAt: string;
      type: ShiftDto['type'];
      notes?: string;
    }) => api.post<ShiftDto>('/teams/shifts', payload),
    onSuccess: () => {
      setShiftForm(DEFAULT_SHIFT_FORM);
      setShiftError(null);
      void queryClient.invalidateQueries({ queryKey: ['teams-overview'] });
    },
    onError: (mutationError: unknown) => {
      setShiftError(mutationError instanceof Error ? mutationError.message : 'Unable to schedule shift');
    },
  });

  const createLabor = useMutation({
    mutationFn: async (payload: {
      userId?: string;
      workOrderId?: string;
      startedAt: string;
      endedAt?: string;
      notes?: string;
    }) => api.post<LaborEntryDto>('/teams/labor', payload),
    onSuccess: () => {
      setLaborForm(DEFAULT_LABOR_FORM);
      setLaborError(null);
      void queryClient.invalidateQueries({ queryKey: ['teams-overview'] });
    },
    onError: (mutationError: unknown) => {
      setLaborError(mutationError instanceof Error ? mutationError.message : 'Unable to log labor');
    },
  });

  const createInvitation = useMutation({
    mutationFn: async (payload: {
      email: string;
      role: string;
      expiresAt?: string;
      message?: string;
    }) => api.post<TeamInvitationDto>('/teams/invitations', payload),
    onSuccess: () => {
      setInviteForm(DEFAULT_INVITE_FORM);
      setInviteError(null);
      setInviteOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['teams-overview'] });
    },
    onError: (mutationError: unknown) => {
      setInviteError(mutationError instanceof Error ? mutationError.message : 'Unable to send invitation');
    },
  });

  const revokeInvitation = useMutation({
    mutationFn: async (invitation: TeamInvitationDto) =>
      api.put<TeamInvitationDto>(`/teams/invitations/${invitation.id}`, { status: 'revoked' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams-overview'] });
    },
  });

  const handleShiftSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMember) {
      return;
    }

    const startsAt = normalizeDateInput(shiftForm.startsAt);
    const endsAt = normalizeDateInput(shiftForm.endsAt);

    if (!startsAt || !endsAt) {
      setShiftError('Start and end times are required');
      return;
    }

    createShift.mutate({
      userId: selectedMember.id !== user?.id ? selectedMember.id : undefined,
      startsAt,
      endsAt,
      type: shiftForm.type as ShiftDto['type'],
      notes: shiftForm.notes || undefined,
    });
  };

  const handleLaborSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMember) {
      return;
    }

    const startedAt = normalizeDateInput(laborForm.startedAt);
    const endedAt = normalizeDateInput(laborForm.endedAt ?? '');

    if (!startedAt) {
      setLaborError('Start time is required');
      return;
    }

    createLabor.mutate({
      userId: selectedMember.id !== user?.id ? selectedMember.id : undefined,
      workOrderId: laborForm.workOrderId ? laborForm.workOrderId.trim() : undefined,
      startedAt,
      endedAt: endedAt ?? undefined,
      notes: laborForm.notes || undefined,
    });
  };

  const handleInviteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteForm.email) {
      setInviteError('Email is required');
      return;
    }

    createInvitation.mutate({
      email: inviteForm.email,
      role: inviteForm.role,
      expiresAt: inviteForm.expiresAt ? normalizeDateInput(inviteForm.expiresAt) ?? undefined : undefined,
      message: inviteForm.message || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-full bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-danger/20 bg-danger/5 p-6 text-danger">
        <p className="font-semibold">Unable to load team data</p>
        <p className="mt-2 text-sm">{error instanceof Error ? error.message : 'Access denied or network error.'}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-6 rounded-3xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-brand/10 p-3 text-brand">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-fg">Team summary</h2>
            <p className="text-sm text-mutedfg">Visibility into roles, coverage, and invitations.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm dark:bg-muted/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-mutedfg">Headcount</p>
            <p className="mt-2 text-2xl font-semibold text-fg">{members.length} people</p>
            <p className="text-xs text-mutedfg">{members.filter((member) => member.status === 'on-shift').length} currently on shift</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white/70 p-4 shadow-sm dark:bg-muted/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-mutedfg">Roles</p>
            <ul className="mt-3 space-y-2 text-sm text-mutedfg">
              <li>
                <button
                  type="button"
                  onClick={() => setSelectedRole('all')}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                    selectedRole === 'all' ? 'bg-brand/10 text-brand' : 'hover:bg-muted'
                  }`}
                >
                  <span>All team members</span>
                  <span>{members.length}</span>
                </button>
              </li>
              {roleSummary.map((role) => (
                <li key={role.role}>
                  <button
                    type="button"
                    onClick={() => setSelectedRole(role.role)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                      selectedRole === role.role ? 'bg-brand/10 text-brand' : 'hover:bg-muted'
                    }`}
                  >
                    <span>{role.label}</span>
                    <span>{role.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {canManageInvites ? (
            <Button
              type="button"
              onClick={() => {
                setInviteError(null);
                setInviteOpen(true);
              }}
              className="w-full rounded-2xl"
            >
              <Plus className="mr-2 h-4 w-4" /> Invite teammate
            </Button>
          ) : null}
        </div>
      </aside>
      <section className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-fg">Teams</h1>
            <p className="mt-2 text-sm text-mutedfg">Coordinate availability, coverage, and labor in one place.</p>
          </div>
          <Button variant="outline" className="rounded-2xl border-border">
            <Shield className="mr-2 h-4 w-4" /> Manage roles
          </Button>
        </header>
        <div className="flex items-center gap-3 rounded-3xl border border-border bg-surface p-4 shadow-xl">
          <Search className="h-4 w-4 text-mutedfg" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members, skills, or roles"
            className="h-9 flex-1 border-none bg-transparent text-sm text-fg focus-visible:ring-0"
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-mutedfg">{filteredMembers.length} people</span>
        </div>
        {canManageInvites && invites.length > 0 ? (
          <div className="rounded-3xl border border-border bg-surface p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-fg">Pending invitations</p>
                <p className="text-xs text-mutedfg">Track onboarding and revoke unused invites.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 p-3">
                  <div>
                    <p className="text-sm font-semibold text-fg">{invite.email}</p>
                    <p className="text-xs text-mutedfg">
                      Role {invite.role} · Sent {formatDateTime(invite.createdAt)}
                      {invite.expiresAt ? ` · Expires ${formatDateTime(invite.expiresAt)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DataBadge status={invite.status} />
                    {invite.status === 'pending' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeInvitation.mutate(invite)}
                        className="rounded-xl"
                        disabled={revokeInvitation.isPending}
                      >
                        {revokeInvitation.isPending ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredMembers.map((member) => (
            <article key={member.id} className="flex h-full flex-col rounded-3xl border border-border bg-surface p-6 shadow-xl transition hover:-translate-y-1 hover:shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-fg">{member.name}</p>
                    <p className="text-sm text-mutedfg">{ROLE_LABELS[member.role] ?? member.role}</p>
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
                  {member.phone ? (
                    <a className="text-fg hover:underline" href={`tel:${member.phone}`}>
                      {member.phone}
                    </a>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-mutedfg">Focus areas</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {member.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-mutedfg">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6 grid gap-3 rounded-2xl bg-muted/60 p-4 text-xs text-mutedfg">
                <div className="flex items-center gap-2 text-sm text-fg">
                  <Clock className="h-4 w-4 text-mutedfg" />
                  {formatDuration(member.laborThisWeek)} logged this week
                </div>
                <div className="flex items-center gap-2 text-sm text-fg">
                  <CalendarClock className="h-4 w-4 text-mutedfg" />
                  {member.upcomingShift
                    ? `Next shift ${formatDateTime(member.upcomingShift.startsAt)}`
                    : 'No upcoming shifts'}
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between pt-4 text-sm text-brand">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 font-semibold"
                  onClick={() => setSelectedMemberId(member.id)}
                >
                  View schedule <ArrowRight className="h-3 w-3" />
                </button>
                <BadgeCheck className="h-4 w-4 text-mutedfg" />
              </div>
            </article>
          ))}
          {filteredMembers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-10 text-center text-sm text-mutedfg">
              No team members match your filters.
            </div>
          ) : null}
        </div>
      </section>
      <SlideOver
        open={Boolean(selectedMember)}
        onClose={() => setSelectedMemberId(null)}
        title={selectedMember ? `${selectedMember.name}` : 'Member details'}
        description={selectedMember ? `${ROLE_LABELS[selectedMember.role] ?? selectedMember.role}` : undefined}
        width="lg"
      >
        {selectedMember ? (
          <div className="space-y-8">
            <section className="grid gap-4 rounded-2xl border border-border bg-white/80 p-4 shadow-sm dark:bg-muted/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-fg">Current coverage</p>
                  <p className="text-xs text-mutedfg">
                    {selectedMember.currentShift
                      ? `On shift until ${formatDateTime(selectedMember.currentShift.endsAt)}`
                      : selectedMember.upcomingShift
                        ? `Next shift ${formatDateTime(selectedMember.upcomingShift.startsAt)}`
                        : 'No active shift scheduled'}
                  </p>
                </div>
                <DataBadge status={selectedMember.status} />
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-mutedfg">Hours logged this week</span>
                  <span className="font-semibold text-fg">{selectedMember.hoursThisWeek.toFixed(1)} h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-mutedfg">Recent work orders</span>
                  <span className="font-semibold text-fg">{selectedMember.recentLabor.length}</span>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">Upcoming schedule</h3>
              </header>
              <div className="space-y-2">
                {selectedMember.upcomingShifts.length > 0 ? (
                  selectedMember.upcomingShifts.map((shift) => (
                    <div key={shift.id} className="rounded-2xl border border-border/60 bg-white/70 p-3 text-sm shadow-sm dark:bg-muted/60">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fg">{formatDateTime(shift.startsAt)}</span>
                        <DataBadge status={shift.status} />
                      </div>
                      <p className="text-xs text-mutedfg">{formatDateTime(shift.endsAt)} · {formatDuration(shift.minutes)}</p>
                      {shift.notes ? <p className="mt-1 text-xs text-mutedfg">{shift.notes}</p> : null}
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-mutedfg">
                    No upcoming shifts scheduled.
                  </p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-fg">Schedule a shift</h3>
              <form className="mt-3 space-y-3" onSubmit={handleShiftSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-mutedfg">
                    Start
                    <Input
                      type="datetime-local"
                      value={formatDateInput(shiftForm.startsAt)}
                      onChange={(event) => setShiftForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                      required
                      className="mt-1"
                    />
                  </label>
                  <label className="text-xs font-semibold text-mutedfg">
                    End
                    <Input
                      type="datetime-local"
                      value={formatDateInput(shiftForm.endsAt)}
                      onChange={(event) => setShiftForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                      required
                      className="mt-1"
                    />
                  </label>
                </div>
                <label className="text-xs font-semibold text-mutedfg">
                  Shift type
                  <select
                    value={shiftForm.type}
                    onChange={(event) => setShiftForm((prev) => ({ ...prev, type: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    <option value="regular">Regular</option>
                    <option value="on_call">On call</option>
                    <option value="leave">Leave</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-mutedfg">
                  Notes
                  <textarea
                    value={shiftForm.notes}
                    onChange={(event) => setShiftForm((prev) => ({ ...prev, notes: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                    rows={3}
                    placeholder="Optional context for the shift"
                  />
                </label>
                {shiftError ? <p className="text-xs text-danger">{shiftError}</p> : null}
                <Button type="submit" className="w-full rounded-xl" disabled={createShift.isPending}>
                  {createShift.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Schedule shift
                </Button>
              </form>
            </section>

            <section className="space-y-3">
              <header className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-fg">Recent labor</h3>
              </header>
              <div className="space-y-2">
                {selectedMember.recentLabor.length > 0 ? (
                  selectedMember.recentLabor.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-border/60 bg-white/70 p-3 text-sm shadow-sm dark:bg-muted/60">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fg">{entry.workOrderTitle ?? 'General labor'}</span>
                        <span className="text-xs text-mutedfg">{formatDuration(entry.minutes)}</span>
                      </div>
                      <p className="text-xs text-mutedfg">{formatDateTime(entry.startedAt)}</p>
                      {entry.notes ? <p className="mt-1 text-xs text-mutedfg">{entry.notes}</p> : null}
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-mutedfg">
                    No labor logged this week.
                  </p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-fg">Log labor entry</h3>
              <form className="mt-3 space-y-3" onSubmit={handleLaborSubmit}>
                <label className="text-xs font-semibold text-mutedfg">
                  Work order ID
                  <Input
                    value={laborForm.workOrderId}
                    onChange={(event) => setLaborForm((prev) => ({ ...prev, workOrderId: event.target.value }))}
                    placeholder="Optional work order reference"
                    className="mt-1"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-mutedfg">
                    Start
                    <Input
                      type="datetime-local"
                      value={formatDateInput(laborForm.startedAt)}
                      onChange={(event) => setLaborForm((prev) => ({ ...prev, startedAt: event.target.value }))}
                      required
                      className="mt-1"
                    />
                  </label>
                  <label className="text-xs font-semibold text-mutedfg">
                    End
                    <Input
                      type="datetime-local"
                      value={formatDateInput(laborForm.endedAt)}
                      onChange={(event) => setLaborForm((prev) => ({ ...prev, endedAt: event.target.value }))}
                      className="mt-1"
                    />
                  </label>
                </div>
                <label className="text-xs font-semibold text-mutedfg">
                  Notes
                  <textarea
                    value={laborForm.notes}
                    onChange={(event) => setLaborForm((prev) => ({ ...prev, notes: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
                    rows={3}
                    placeholder="Optional details"
                  />
                </label>
                {laborError ? <p className="text-xs text-danger">{laborError}</p> : null}
                <Button type="submit" className="w-full rounded-xl" disabled={createLabor.isPending}>
                  {createLabor.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Log labor
                </Button>
              </form>
            </section>
          </div>
        ) : null}
      </SlideOver>
      <SlideOver
        open={isInviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a teammate"
        description="Send an email invitation with pre-configured role permissions."
      >
        <form className="space-y-4" onSubmit={handleInviteSubmit}>
          <label className="text-xs font-semibold text-mutedfg">
            Email
            <Input
              type="email"
              required
              value={inviteForm.email}
              onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
              className="mt-2"
              placeholder="person@company.com"
            />
          </label>
          <label className="text-xs font-semibold text-mutedfg">
            Role
            <select
              value={inviteForm.role}
              onChange={(event) => setInviteForm((prev) => ({ ...prev, role: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="technician">Technician</option>
              <option value="planner">Planner</option>
              <option value="manager">Manager</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-mutedfg">
            Expires at
            <Input
              type="datetime-local"
              value={inviteForm.expiresAt}
              onChange={(event) => setInviteForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
              className="mt-2"
            />
          </label>
          <label className="text-xs font-semibold text-mutedfg">
            Message
            <textarea
              value={inviteForm.message}
              onChange={(event) => setInviteForm((prev) => ({ ...prev, message: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-fg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand"
              rows={4}
              placeholder="Optional welcome message"
            />
          </label>
          {inviteError ? <p className="text-xs text-danger">{inviteError}</p> : null}
          <Button type="submit" className="w-full rounded-xl" disabled={createInvitation.isPending}>
            {createInvitation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send invite
          </Button>
        </form>
      </SlideOver>
    </div>
  );
}
