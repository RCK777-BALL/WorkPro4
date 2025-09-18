import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { ok, fail, asyncHandler } from '../utils/response';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      tenant: true,
    },
  });

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return fail(res, 401, 'Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );

  return ok(res, {
    token,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      roles: user.roles,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  });
}));

router.get('/me', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      tenant: true,
    },
  });

  if (!user) {
    return fail(res, 404, 'User not found');
  }

  return ok(res, {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    roles: user.roles,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
}));

export default router;