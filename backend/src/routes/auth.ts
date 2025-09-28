import { Router } from 'express';
import bcrypt from '../lib/bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ok, fail, asyncHandler } from '../utils/response';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { getJwtSecret } from '../config/auth';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return fail(res, 401, 'Invalid credentials');
  }

  const passwordMatches = bcrypt.compareSync(password, user.passwordHash);

  if (!passwordMatches) {
    return fail(res, 401, 'Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.id },
    getJwtSecret(),
    { expiresIn: '24h' }
  );

  return ok(res, {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      tenantId: user.tenantId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
  });
}));

router.get('/me', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user) {
    return fail(res, 404, 'User not found');
  }

  return ok(res, {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,
    tenantId: user.tenantId,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
}));

export default router;
