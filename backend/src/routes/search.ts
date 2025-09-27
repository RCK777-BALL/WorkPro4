import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ok } from '../utils/response';

const router = Router();

router.use(authenticateToken);

router.get('/', (_req, res) => {
  return ok(res, []);
});

export default router;
