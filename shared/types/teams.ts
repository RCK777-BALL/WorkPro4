export type ShiftType = 'regular' | 'on_call' | 'leave';
export type ShiftStatus = 'pending' | 'approved' | 'completed' | 'cancelled';

export interface ShiftDto {
  id: string;
  tenantId: string;
  userId: string;
  type: ShiftType;
  status: ShiftStatus | 'expired';
  startsAt: string;
  endsAt: string;
  minutes: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LaborEntryDto {
  id: string;
  tenantId: string;
  userId: string;
  workOrderId: string | null;
  workOrderTitle: string | null;
  startedAt: string;
  endedAt: string | null;
  minutes: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface TeamInvitationDto {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  status: InvitationStatus;
  message: string | null;
  invitedById: string | null;
  invitedByName: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MemberPresenceStatus = 'on-shift' | 'standby' | 'available' | 'off-duty' | 'on-leave';

export interface TeamMemberDto {
  id: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
  phone: string | null;
  status: MemberPresenceStatus | string;
  tags: string[];
  upcomingShift: ShiftDto | null;
  currentShift: ShiftDto | null;
  hoursThisWeek: number;
  laborThisWeek: number;
  recentLabor: LaborEntryDto[];
  upcomingShifts: ShiftDto[];
}

export interface TeamsOverviewResponse {
  members: TeamMemberDto[];
  invites: TeamInvitationDto[];
  viewerRole: string;
  canManageInvites: boolean;
  scheduleWindow: {
    start: string;
    end: string;
  };
}
