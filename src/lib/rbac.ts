import { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';

type Action = 'view' | 'manage' | 'create' | 'edit' | 'delete';
type Subject = 'asset' | 'workOrder' | 'inventory' | string;

const roleMatrix: Record<string, Partial<Record<Action, Subject[]>>> = {
  admin: {
    manage: ['asset', 'workOrder', 'inventory'],
    create: ['asset', 'workOrder', 'inventory'],
    edit: ['asset', 'workOrder', 'inventory'],
    delete: ['asset', 'workOrder', 'inventory'],
    view: ['asset', 'workOrder', 'inventory'],
  },
  manager: {
    manage: ['asset', 'workOrder'],
    create: ['asset', 'workOrder'],
    edit: ['asset', 'workOrder'],
    delete: ['asset'],
    view: ['asset', 'workOrder', 'inventory'],
  },
  technician: {
    view: ['asset', 'workOrder'],
    edit: ['workOrder'],
  },
  user: {
    view: ['asset'],
  },
};

function normalizeRole(role?: string | null): string {
  return (role ?? 'user').toLowerCase();
}

export function can(action: Action, subject: Subject, role?: string | null): boolean {
  const normalizedRole = normalizeRole(role);
  const permissions = roleMatrix[normalizedRole] ?? roleMatrix.user;
  const allowedSubjects = permissions[action];
  if (!allowedSubjects) {
    return false;
  }
  return allowedSubjects.includes(subject) || allowedSubjects.includes('*');
}

export function useCan(action: Action, subject: Subject): boolean {
  const role = useAuth((state) => state.user?.role ?? 'user');
  return useMemo(() => can(action, subject, role), [action, subject, role]);
}
