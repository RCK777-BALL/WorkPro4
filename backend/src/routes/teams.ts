import { Router } from 'express';
import { z } from 'zod';
import type { Shift } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { authenticateToken, AuthRequest, requireRoles } from '../middleware/auth';
import { asyncHandler, fail, ok } from '../utils/response';

const router = Router();

const TEAM_VIEW_ROLES = ['admin', 'manager', 'planner', 'technician', 'viewer', 'user'];
const TEAM_ACTIVE_ROLES = ['admin', 'manager', 'planner', 'technician'];
const MANAGEMENT_ROLES = ['admin', 'manager', 'planner'];
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const shiftInputSchema = z
  .object({
    userId: z
      .string()
      .trim()
      .regex(OBJECT_ID_REGEX, 'userId must be a valid id')
      .optional(),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    type: z.enum(['regular', 'on_call', 'leave']).default('regular'),
    status: z.enum(['pending', 'approved', 'completed', 'cancelled']).optional(),
    notes: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional()
      .or(z.literal('').transform(() => undefined)),
  })
  .refine((value) => new Date(value.endsAt).getTime() > new Date(value.startsAt).getTime(), {
    message: 'Shift end time must be after start time',
    path: ['endsAt'],
  });

const laborEntrySchema = z
  .object({
    userId: z
      .string()
      .trim()
      .regex(OBJECT_ID_REGEX, 'userId must be a valid id')
      .optional(),
    workOrderId: z
      .string()
      .trim()
      .regex(OBJECT_ID_REGEX, 'workOrderId must be a valid id')
      .optional(),
    startedAt: z.string().datetime({ offset: true }),
    endedAt: z.string().datetime({ offset: true }).optional(),
    minutes: z.number().int().positive().max(24 * 60).optional(),
    notes: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .optional()
      .or(z.literal('').transform(() => undefined)),
  })
  .refine((value) => Boolean(value.minutes) || Boolean(value.endedAt), {
    message: 'Provide either minutes or an end time for the labor entry',
    path: ['minutes'],
  });

const invitationSchema = z.object({
  email: z.string().email(),
  role: z.string().trim().min(1),
  expiresAt: z.string().datetime({ offset: true }).optional(),
  message: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

const updateInvitationSchema = z.object({
  status: z.enum(['pending', 'accepted', 'revoked']),
});

type LaborEntryWithWorkOrder = Prisma.LaborEntryGetPayload<{
  include: { workOrder: { select: { id: true; title: true } } };
}>;

type InvitationWithUser = Prisma.TeamInvitationGetPayload<{
  include: { invitedBy: { select: { id: true; name: true } } };
}>;

const ROLE_TAGS: Record<string, string[]> = {
  admin: ['Leadership', 'Security'],
  manager: ['Leadership', 'Planning'],
  planner: ['Scheduling', 'Workflow'],
  technician: ['Field Ops', 'Maintenance'],
  viewer: ['Observer'],
  user: ['Contributor'],
};

router.use(authenticateToken);

function mapShift(shift: Shift) {
  const minutes = Math.max(0, Math.round((shift.endsAt.getTime() - shift.startsAt.getTime()) / 60000));

  return {
    id: shift.id,
    tenantId: shift.tenantId,
    userId: shift.userId,
    type: shift.type,
    status: shift.status,
    startsAt: shift.startsAt.toISOString(),
    endsAt: shift.endsAt.toISOString(),
    minutes,
    notes: shift.notes ?? null,
    createdAt: shift.createdAt.toISOString(),
    updatedAt: shift.updatedAt.toISOString(),
  };
}

function mapLaborEntry(entry: LaborEntryWithWorkOrder) {
  return {
    id: entry.id,
    tenantId: entry.tenantId,
    userId: entry.userId,
    workOrderId: entry.workOrderId ?? null,
    workOrderTitle: entry.workOrder?.title ?? null,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt ? entry.endedAt.toISOString() : null,
    minutes: entry.minutes,
    notes: entry.notes ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function mapInvitation(invite: InvitationWithUser) {
  const now = Date.now();
  let status: 'pending' | 'accepted' | 'revoked' | 'expired' = invite.status;

  if (status === 'pending' && invite.expiresAt && invite.expiresAt.getTime() < now) {
    status = 'expired';
  }

  return {
    id: invite.id,
    tenantId: invite.tenantId,
    email: invite.email,
    role: invite.role,
    status,
    message: invite.message ?? null,
    invitedById: invite.invitedBy?.id ?? null,
    invitedByName: invite.invitedBy?.name ?? null,
    expiresAt: invite.expiresAt ? invite.expiresAt.toISOString() : null,
    createdAt: invite.createdAt.toISOString(),
    updatedAt: invite.updatedAt.toISOString(),
  };
}

function startOfCurrentWeek(): Date {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  const diffToMonday = (day + 6) % 7;
  weekStart.setDate(weekStart.getDate() - diffToMonday);
  return weekStart;
}

function resolveStatus(
  currentShift: ReturnType<typeof mapShift> | undefined,
  upcomingShift: ReturnType<typeof mapShift> | undefined,
) {
  if (currentShift) {
    if (currentShift.type === 'leave') {
      return 'on-leave';
    }
    return 'on-shift';
  }

  if (upcomingShift) {
    if (upcomingShift.type === 'leave') {
      return 'on-leave';
    }

    const start = new Date(upcomingShift.startsAt).getTime();
    const diffHours = (start - Date.now()) / (1000 * 60 * 60);
    if (diffHours <= 6) {
      return 'standby';
    }
    return 'available';
  }

  return 'off-duty';
}

router.get(
  '/',
  requireRoles(TEAM_VIEW_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const viewerRole = req.user.role ?? 'user';
    const canManageInvites = MANAGEMENT_ROLES.includes(viewerRole);

    const [users, shifts, laborEntries, invitations] = await Promise.all([
      prisma.user.findMany({
        where: { tenantId: req.user.tenantId },
        orderBy: { name: 'asc' },
      }),
      prisma.shift.findMany({
        where: { tenantId: req.user.tenantId },
        orderBy: { startsAt: 'asc' },
      }),
      prisma.laborEntry.findMany({
        where: { tenantId: req.user.tenantId },
        include: { workOrder: { select: { id: true, title: true } } },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.teamInvitation.findMany({
        where: { tenantId: req.user.tenantId },
        include: { invitedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const mappedShifts = shifts.map(mapShift);
    const mappedLabor = laborEntries.map(mapLaborEntry);
    const shiftsByUser = new Map<string, ReturnType<typeof mapShift>[]>();
    const laborByUser = new Map<string, ReturnType<typeof mapLaborEntry>[]>();

    for (const shift of mappedShifts) {
      const list = shiftsByUser.get(shift.userId) ?? [];
      list.push(shift);
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      shiftsByUser.set(shift.userId, list);
    }

    for (const entry of mappedLabor) {
      const list = laborByUser.get(entry.userId) ?? [];
      list.push(entry);
      list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      laborByUser.set(entry.userId, list);
    }

    const weekStart = startOfCurrentWeek();
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const members = users.map((member) => {
      const memberShifts = shiftsByUser.get(member.id) ?? [];
      const memberLabor = laborByUser.get(member.id) ?? [];
      const now = new Date();
      const currentShift = memberShifts.find((shift) => {
        const start = new Date(shift.startsAt);
        const end = new Date(shift.endsAt);
        return start <= now && end >= now;
      });
      const upcomingShifts = memberShifts.filter((shift) => new Date(shift.startsAt) > now);
      const upcomingShift = upcomingShifts[0];

      const minutesThisWeek = memberLabor
        .filter((entry) => {
          const startedAt = new Date(entry.startedAt);
          return startedAt >= weekStart && startedAt < weekEnd;
        })
        .reduce((sum, entry) => sum + entry.minutes, 0);

      const status = resolveStatus(currentShift, upcomingShift);
      const tags = ROLE_TAGS[member.role ?? 'user'] ?? ROLE_TAGS.user;

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role ?? 'user',
        joinedAt: member.createdAt.toISOString(),
        phone: null,
        status,
        tags,
        upcomingShift: upcomingShift ?? null,
        currentShift: currentShift ?? null,
        hoursThisWeek: Number((minutesThisWeek / 60).toFixed(1)),
        laborThisWeek: minutesThisWeek,
        recentLabor: memberLabor.slice(0, 5),
        upcomingShifts,
      };
    });

    const payload = {
      members,
      invites: canManageInvites ? invitations.map(mapInvitation) : [],
      viewerRole,
      canManageInvites,
      scheduleWindow: {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      },
    };

    return ok(res, payload);
  }),
);

router.get(
  '/shifts',
  requireRoles(TEAM_VIEW_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const viewerRole = req.user.role ?? 'user';
    const where: Prisma.ShiftWhereInput = {
      tenantId: req.user.tenantId,
    };

    if (!MANAGEMENT_ROLES.includes(viewerRole)) {
      where.userId = req.user.id;
    }

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: { startsAt: 'asc' },
    });

    return ok(res, shifts.map(mapShift));
  }),
);

router.post(
  '/shifts',
  requireRoles(TEAM_ACTIVE_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const viewerRole = req.user.role ?? 'user';
    const parsed = shiftInputSchema.parse(req.body);
    const targetUserId = parsed.userId ?? req.user.id;

    if (targetUserId !== req.user.id && !MANAGEMENT_ROLES.includes(viewerRole)) {
      return fail(res, 403, 'You do not have permission to schedule shifts for other users');
    }

    const user = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId: req.user.tenantId },
      select: { id: true },
    });

    if (!user) {
      return fail(res, 404, 'User not found for shift');
    }

    const start = new Date(parsed.startsAt);
    const end = new Date(parsed.endsAt);
    const status = parsed.status ?? (MANAGEMENT_ROLES.includes(viewerRole) ? 'approved' : 'pending');

    const shift = await prisma.shift.create({
      data: {
        tenantId: req.user.tenantId,
        userId: targetUserId,
        startsAt: start,
        endsAt: end,
        type: parsed.type,
        status,
        notes: parsed.notes,
      },
    });

    return ok(res, mapShift(shift));
  }),
);

router.get(
  '/labor',
  requireRoles(TEAM_ACTIVE_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const viewerRole = req.user.role ?? 'user';
    const where: Prisma.LaborEntryWhereInput = {
      tenantId: req.user.tenantId,
    };

    if (!MANAGEMENT_ROLES.includes(viewerRole)) {
      where.userId = req.user.id;
    }

    const labor = await prisma.laborEntry.findMany({
      where,
      include: { workOrder: { select: { id: true, title: true } } },
      orderBy: { startedAt: 'desc' },
    });

    return ok(res, labor.map(mapLaborEntry));
  }),
);

router.post(
  '/labor',
  requireRoles(TEAM_ACTIVE_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const viewerRole = req.user.role ?? 'user';
    const parsed = laborEntrySchema.parse(req.body);
    const targetUserId = parsed.userId ?? req.user.id;

    if (targetUserId !== req.user.id && !MANAGEMENT_ROLES.includes(viewerRole)) {
      return fail(res, 403, 'You do not have permission to log labor for other users');
    }

    const user = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId: req.user.tenantId },
      select: { id: true },
    });

    if (!user) {
      return fail(res, 404, 'User not found for labor entry');
    }

    let workOrderId: string | undefined;
    if (parsed.workOrderId) {
      const workOrder = await prisma.workOrder.findFirst({
        where: { id: parsed.workOrderId, tenantId: req.user.tenantId },
        select: { id: true },
      });

      if (!workOrder) {
        return fail(res, 404, 'Work order not found for labor entry');
      }

      workOrderId = parsed.workOrderId;
    }

    const startedAt = new Date(parsed.startedAt);
    const endedAt = parsed.endedAt ? new Date(parsed.endedAt) : null;
    let minutes = parsed.minutes ?? 0;

    if (endedAt) {
      const diff = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
      if (diff > 0) {
        minutes = diff;
      }
    }

    if (minutes <= 0) {
      minutes = 15;
    }

    const laborEntry = await prisma.laborEntry.create({
      data: {
        tenantId: req.user.tenantId,
        userId: targetUserId,
        workOrderId,
        startedAt,
        endedAt: endedAt ?? undefined,
        minutes,
        notes: parsed.notes,
      },
      include: { workOrder: { select: { id: true, title: true } } },
    });

    return ok(res, mapLaborEntry(laborEntry));
  }),
);

router.post(
  '/invitations',
  requireRoles(MANAGEMENT_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const parsed = invitationSchema.parse(req.body);
    const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : undefined;

    const invitation = await prisma.teamInvitation.create({
      data: {
        tenantId: req.user.tenantId,
        email: parsed.email,
        role: parsed.role,
        status: 'pending',
        message: parsed.message,
        expiresAt,
        invitedById: req.user.id,
      },
      include: { invitedBy: { select: { id: true, name: true } } },
    });

    return ok(res, mapInvitation(invitation));
  }),
);

router.put(
  '/invitations/:id',
  requireRoles(MANAGEMENT_ROLES),
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required');
    }

    const invitationId = req.params.id;

    if (!OBJECT_ID_REGEX.test(invitationId)) {
      return fail(res, 400, 'Invalid invitation id');
    }

    const payload = updateInvitationSchema.parse(req.body);

    const existing = await prisma.teamInvitation.findFirst({
      where: { id: invitationId, tenantId: req.user.tenantId },
      include: { invitedBy: { select: { id: true, name: true } } },
    });

    if (!existing) {
      return fail(res, 404, 'Invitation not found');
    }

    const updated = await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: { status: payload.status },
      include: { invitedBy: { select: { id: true, name: true } } },
    });

    return ok(res, mapInvitation(updated));
  }),
);

export default router;
