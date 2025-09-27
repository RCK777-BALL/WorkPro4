import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ok } from '../utils/response';

const router = Router();

router.use(authenticateToken);

router.get('/', (_req, res) => {
  return ok(res, {
    workOrders: 0,
    openWorkOrders: 0,
    completedWorkOrders: 0,
  });
});

export default router;
