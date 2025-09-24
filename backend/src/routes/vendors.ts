import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { ok, fail, asyncHandler } from '../utils/response';
import { authenticateToken, AuthRequest, requireRoles } from '../middleware/auth';
import { tenantScope } from '../middleware/tenant';
import { auditLog } from '../middleware/audit';
import { prisma } from '../db';

const router = Router();

router.use(authenticateToken);
router.use(tenantScope);

const createVendorSchema = z.object({
  name: z.string().min(1),
  contact: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
});

const updateVendorSchema = createVendorSchema.partial();

// GET /vendors
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;

  const vendors = await prisma.vendor.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });

  return ok(res, vendors.map(vendor => ({
    ...vendor,
    contact: vendor.contactJson as any,
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
  })));
}));

// POST /vendors
router.post('/', requireRoles(['planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const data = createVendorSchema.parse(req.body);

  const vendor = await prisma.vendor.create({
    data: {
      name: data.name,
      contactJson: data.contact ?? null,
      tenantId,
    },
  });

  await auditLog(tenantId, userId, 'create', 'vendor', vendor.id, null, vendor);

  return ok(res, {
    ...vendor,
    contact: vendor.contactJson as any,
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
  });
}));

// PUT /vendors/:id
router.put('/:id', requireRoles(['planner', 'supervisor', 'admin']), asyncHandler(async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { id } = req.params;
  const data = updateVendorSchema.parse(req.body);

  const existing = await prisma.vendor.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return fail(res, 404, 'Vendor not found');
  }

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.contact !== undefined) {
    updateData.contactJson = data.contact ?? null;
  }

  const vendor = await prisma.vendor.update({
    where: { id },
    data: updateData,
  });

  await auditLog(tenantId, userId, 'update', 'vendor', id, existing, vendor);

  return ok(res, {
    ...vendor,
    contact: vendor.contactJson as any,
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
  });
}));

export default router;