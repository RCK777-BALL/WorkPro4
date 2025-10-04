import { type ComponentPropsWithoutRef } from 'react';

const variants: Record<string, { background: string; text: string; label: string }> = {
  open: { background: 'bg-brand/10', text: 'text-brand', label: 'Open' },
  assigned: { background: 'bg-brand/10', text: 'text-brand', label: 'Assigned' },
  requested: { background: 'bg-brand/10', text: 'text-brand', label: 'Requested' },
  'in progress': { background: 'bg-warning/10', text: 'text-warning', label: 'In Progress' },
  'in-progress': { background: 'bg-warning/10', text: 'text-warning', label: 'In Progress' },
  in_progress: { background: 'bg-warning/10', text: 'text-warning', label: 'In Progress' },
  blocked: { background: 'bg-danger/10', text: 'text-danger', label: 'Blocked' },
  overdue: { background: 'bg-danger/10', text: 'text-danger', label: 'Overdue' },
  done: { background: 'bg-success/10', text: 'text-success', label: 'Completed' },
  completed: { background: 'bg-success/10', text: 'text-success', label: 'Completed' },
  cancelled: { background: 'bg-muted', text: 'text-mutedfg', label: 'Cancelled' },
  scheduled: { background: 'bg-muted', text: 'text-fg', label: 'Scheduled' },
  low: { background: 'bg-success/10', text: 'text-success', label: 'Low' },
  medium: { background: 'bg-warning/10', text: 'text-warning', label: 'Medium' },
  high: { background: 'bg-danger/10', text: 'text-danger', label: 'High' },
  urgent: { background: 'bg-danger/10', text: 'text-danger', label: 'Urgent' },
  operational: { background: 'bg-success/10', text: 'text-success', label: 'Operational' },
  maintenance: { background: 'bg-warning/10', text: 'text-warning', label: 'Maintenance' },
  down: { background: 'bg-danger/10', text: 'text-danger', label: 'Down' },
  available: { background: 'bg-success/10', text: 'text-success', label: 'Available' },
  busy: { background: 'bg-warning/10', text: 'text-warning', label: 'Busy' },
  'on leave': { background: 'bg-danger/10', text: 'text-danger', label: 'On Leave' },
  'on-leave': { background: 'bg-danger/10', text: 'text-danger', label: 'On Leave' },
  'on-shift': { background: 'bg-brand/10', text: 'text-brand', label: 'On Shift' },
  standby: { background: 'bg-warning/10', text: 'text-warning', label: 'Standby' },
  'off-duty': { background: 'bg-muted', text: 'text-mutedfg', label: 'Off Duty' },
  pending: { background: 'bg-warning/10', text: 'text-warning', label: 'Pending' },
  accepted: { background: 'bg-success/10', text: 'text-success', label: 'Accepted' },
  revoked: { background: 'bg-danger/10', text: 'text-danger', label: 'Revoked' },
  expired: { background: 'bg-muted', text: 'text-mutedfg', label: 'Expired' }
};

export interface DataBadgeProps extends ComponentPropsWithoutRef<'span'> {
  status: keyof typeof variants | string;
  label?: string;
}

export function DataBadge({ status, label, className = '', ...props }: DataBadgeProps) {
  const normalized = status.toLowerCase();
  const variant = variants[normalized] ?? { background: 'bg-muted', text: 'text-fg', label: label ?? status };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${variant.background} ${variant.text} ${className}`}
      {...props}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label ?? variant.label}
    </span>
  );
}
