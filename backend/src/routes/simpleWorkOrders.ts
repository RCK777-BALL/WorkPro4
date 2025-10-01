import { Router } from 'express';
import { authOptional } from '../middleware/auth';
import {
  createWorkOrder,
  deleteWorkOrder,
  listWorkOrders,
  updateWorkOrder,
} from '../controllers/workOrderController';

const workOrderRoutes = Router();

workOrderRoutes.use(authOptional);
workOrderRoutes.get('/', listWorkOrders);
workOrderRoutes.post('/', createWorkOrder);
workOrderRoutes.patch('/:id', updateWorkOrder);
workOrderRoutes.delete('/:id', deleteWorkOrder);

export default workOrderRoutes;
