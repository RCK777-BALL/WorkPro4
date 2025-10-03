import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authenticateToken, type AuthRequest } from './auth';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
})) as {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

vi.mock('../db', () => ({
  prisma: prismaMock,
}));

vi.mock('../config/auth', () => ({
  getJwtSecret: vi.fn(() => 'test-secret'),
}));

function createResponse() {
  const res = {} as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };

  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);

  return res;
}

describe('authenticateToken', () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
  });

  it('responds with 401 when the token contains an invalid user id', async () => {
    const token = jwt.sign({ userId: 'not-a-valid-object-id' }, 'test-secret');

    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as unknown as AuthRequest;

    const res = createResponse();
    const next = vi.fn();

    await new Promise<void>((resolve) => {
      res.json.mockImplementationOnce((value) => {
        resolve();
        return res;
      });

      authenticateToken(req, res, next);
    });

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      error: {
        code: 401,
        message: 'Invalid or expired token',
        details: undefined,
      },
    });
    expect(next).not.toHaveBeenCalled();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
