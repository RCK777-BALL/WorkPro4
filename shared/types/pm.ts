export type PmTriggerType = 'calendar' | 'meter';
export type PmTriggerRunStatus = 'success' | 'skipped' | 'failed';

export interface PmTaskDto {
  id: string;
  title: string;
  instructions: string | null;
  position: number;
  estimatedMinutes: number | null;
  requiresSignOff: boolean;
}

export interface PmTriggerDto {
  id: string;
  type: PmTriggerType;
  cronExpression: string | null;
  intervalDays: number | null;
  meterThreshold: number | null;
  settings: unknown;
  startDate: string | null;
  endDate: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  isActive: boolean;
}

export interface PmProgramDto {
  id: string;
  name: string;
  description: string | null;
  assetId: string | null;
  timezone: string;
  isActive: boolean;
  lastGeneratedAt: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
  } | null;
  tasks: PmTaskDto[];
  triggers: PmTriggerDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PmTriggerRunDto {
  id: string;
  triggerId: string;
  programId: string;
  programName: string;
  status: PmTriggerRunStatus;
  runAt: string;
  scheduledFor: string | null;
  workOrderId: string | null;
  error: string | null;
  details: unknown;
}

export interface PmOverviewStatsDto {
  activePrograms: number;
  overdueTriggers: number;
  upcomingWeek: number;
  totalTasks: number;
}

export interface PmUpcomingEventDto {
  id: string;
  programId: string;
  programName: string;
  triggerId: string;
  scheduledFor: string;
  overdue: boolean;
}

export interface PmOverviewResponse {
  stats: PmOverviewStatsDto;
  programs: PmProgramDto[];
  upcomingEvents: PmUpcomingEventDto[];
  runs: PmTriggerRunDto[];
}
