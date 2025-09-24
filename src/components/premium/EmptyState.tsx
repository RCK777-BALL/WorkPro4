import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface px-10 py-16 text-center shadow-inner">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 text-brand">
        {icon}
      </div>
      <h3 className="mt-6 text-2xl font-semibold text-fg">{title}</h3>
      <p className="mt-3 max-w-md text-sm text-mutedfg">{description}</p>
      {action && <div className="mt-6 flex items-center gap-3">{action}</div>}
    </div>
  );
}
